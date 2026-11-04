using System;
using System.Collections.Generic;
using System.Globalization;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Runtime;
using ExpedientesSPR.Nucleo;
using AcApp = Autodesk.AutoCAD.ApplicationServices.Core.Application;

namespace ExpedientesSPR
{
    public sealed class Comandos
    {
        const string BloqueVineta = "SPR_VINETA";
        const string BloqueCuadro = "SPR_CUADRO";
        const string ClaveDibujo = "EXPEDIENTES_SPR";

        static Document Doc => AcApp.DocumentManager.MdiActiveDocument;
        static Editor Ed => Doc.Editor;

        /// <summary>Ejecuta un comando mostrando los errores de forma entendible.</summary>
        static void Ejecutar(string nombre, Action accion)
        {
            try { accion(); }
            catch (ErrorUsuario e) { Ed.WriteMessage("\n" + e.Message + "\n"); }
            catch (System.Exception e)
            {
                Aplicacion.Registrar($"{nombre}: {e}");
                Ed.WriteMessage($"\nError inesperado en {nombre}: {e.Message}\nDetalle en %APPDATA%\\Expedientes SPR\\plugin\\plugin.log\n");
            }
        }

        [CommandMethod("SPR_INGRESAR")]
        public void Ingresar() => Ejecutar("SPR_INGRESAR", () => PedirIngreso());

        [CommandMethod("SPR_SALIR")]
        public void Salir() => Ejecutar("SPR_SALIR", () =>
        {
            Aplicacion.Cliente.CerrarSesion();
            Ed.WriteMessage("\nSesión cerrada en este equipo.\n");
        });

        [CommandMethod("SPR_EXPEDIENTE")]
        public void Expediente() => Ejecutar("SPR_EXPEDIENTE", () => ElegirExpediente());

        [CommandMethod("SPR_VINETA")]
        public void Vineta() => Ejecutar("SPR_VINETA", () => HacerVineta(false));

        /// <summary>Recalcula el cuadro de superficie con los lotes del dibujo (dentro de la viñeta, o suelto si no hay viñeta).</summary>
        [CommandMethod("SPR_CUADRO")]
        public void CuadroSuperficie() => Ejecutar("SPR_CUADRO", () =>
        {
            var db = Doc.Database;
            int vinetas;
            using (var tr = db.TransactionManager.StartOpenCloseTransaction()) vinetas = Referencias(tr, db);
            if (vinetas > 0)
            {
                HacerVineta(true);
                return;
            }
            var avisos = new List<string>();
            List<Lote> lotes;
            using (var tr = db.TransactionManager.StartOpenCloseTransaction()) lotes = Lotes.Todos(tr, db, avisos);
            if (lotes.Count == 0) throw new ErrorUsuario("No hay lotes marcados. Primero usa SPR_LOTES para indicar las polilíneas de los lotes.");
            var dib = Nucleo.Cuadro.Generar(lotes, new OpcionesVineta());
            using (Doc.LockDocument())
            using (var tr = db.TransactionManager.StartTransaction())
            {
                var bt = (BlockTable)tr.GetObject(db.BlockTableId, OpenMode.ForRead);
                var existe = bt.Has(BloqueCuadro);
                var bloque = Dibujar.DefinirBloque(tr, db, BloqueCuadro, dib);
                if (!existe || Referencias(tr, db, BloqueCuadro) == 0)
                {
                    var res = Ed.GetPoint(new PromptPointOptions("\nEsquina superior izquierda del cuadro de superficie: "));
                    if (res.Status != PromptStatus.OK) return;
                    var enModelo = db.TileMode || db.CurrentSpaceId == SymbolUtilityServices.GetBlockModelSpaceId(db);
                    var escalaPlano = EscalaGuardada() ?? 1000;
                    Dibujar.Insertar(tr, db, db.CurrentSpaceId, bloque, res.Value.TransformBy(Ed.CurrentUserCoordinateSystem), enModelo ? escalaPlano / 1000.0 : 1.0);
                }
                else ActualizarReferencias(tr, db, BloqueCuadro);
                tr.Commit();
            }
            Ed.Regen();
            InformarLotes(lotes, avisos);
        });

        /// <summary>Marca polilíneas cerradas como lotes: nombre, servidumbre (opcional) y su ancho.</summary>
        [CommandMethod("SPR_LOTES")]
        public void MarcarLotes() => Ejecutar("SPR_LOTES", () =>
        {
            var db = Doc.Database;
            if (db.Insunits != UnitsValue.Meters && db.Insunits != UnitsValue.Undefined)
                Ed.WriteMessage($"\nOjo: las unidades del dibujo son «{db.Insunits}». Las superficies se calculan suponiendo metros.");
            string ultimo = null;
            double anchoAnterior = 6;
            var n = 0;
            while (true)
            {
                var pe = new PromptEntityOptions("\nSelecciona el borde de un lote (polilínea cerrada) o Enter para terminar: ") { AllowNone = true };
                pe.SetRejectMessage("\nDebe ser una polilínea.");
                pe.AddAllowedClass(typeof(Polyline), true);
                var r = Ed.GetEntity(pe);
                if (r.Status != PromptStatus.OK) break;

                using (Doc.LockDocument())
                using (var tr = db.TransactionManager.StartTransaction())
                {
                    var pl = (Polyline)tr.GetObject(r.ObjectId, OpenMode.ForRead);
                    if (!Lotes.Cerrada(pl)) Ed.WriteMessage("\nAviso: la polilínea no está cerrada; ciérrala (propiedad «Cerrada») para que la superficie sea la correcta.");
                    pl.Highlight();
                    try
                    {
                        var previo = Lotes.Leer(pl);
                        var sugerido = previo?.Nombre ?? Lotes.Siguiente(ultimo);
                        var ps = new PromptStringOptions($"\nNombre del lote <{sugerido}>: ") { AllowSpaces = true };
                        var rn = Ed.GetString(ps);
                        if (rn.Status != PromptStatus.OK) return;
                        var nombre = string.IsNullOrWhiteSpace(rn.StringResult) ? sugerido : rn.StringResult.Trim();

                        var psv = new PromptEntityOptions($"\nPolilínea de la servidumbre dentro de «{nombre}» o Enter si no tiene: ") { AllowNone = true };
                        psv.SetRejectMessage("\nDebe ser una polilínea.");
                        psv.AddAllowedClass(typeof(Polyline), true);
                        var rs = Ed.GetEntity(psv);
                        if (rs.Status == PromptStatus.Cancel) return;
                        Polyline serv = null;
                        double? ancho = null;
                        if (rs.Status == PromptStatus.OK)
                        {
                            if (rs.ObjectId == r.ObjectId) throw new ErrorUsuario("La servidumbre debe ser otra polilínea, no el borde del lote.");
                            serv = (Polyline)tr.GetObject(rs.ObjectId, OpenMode.ForRead);
                            var pd = new PromptDoubleOptions($"\nAncho de la servidumbre en metros <{Nucleo.Cuadro.Metros(previo?.Ancho ?? anchoAnterior)}>: ")
                            {
                                AllowNone = true, AllowNegative = false, AllowZero = false, DefaultValue = previo?.Ancho ?? anchoAnterior, UseDefaultValue = true,
                            };
                            var ra = Ed.GetDouble(pd);
                            if (ra.Status != PromptStatus.OK) return;
                            ancho = anchoAnterior = ra.Value;
                        }
                        Lotes.Guardar(tr, db, pl, nombre, serv, ancho);
                        tr.Commit();
                        ultimo = nombre;
                        n++;
                        Ed.WriteMessage($"\n{nombre}: {Nucleo.Cuadro.Hectareas(pl.Area)} ha" +
                                        (serv != null ? $", servidumbre {Nucleo.Cuadro.Hectareas(serv.Area)} ha ({Nucleo.Cuadro.Metros(ancho ?? 0)})" : "") + ".");
                    }
                    finally { pl.Unhighlight(); }
                }
            }
            if (n > 0) Ed.WriteMessage($"\n{n} lote(s) marcados. Ejecuta SPR_CUADRO para actualizar el cuadro de superficie.\n");
        });

        static void HacerVineta(bool soloActualizar)
        {
            var guardado = Leer();
            var id = guardado.id ?? ElegirExpediente();
            if (id == null) return;
            var datos = Aplicacion.Cliente.CargarExpediente(id.Value);

            // Formato y sello: se recuerdan en el dibujo (al actualizar el cuadro no se preguntan)
            var formato = soloActualizar ? guardado.formato ?? "A0" : Opcion("Formato de la hoja", new[] { "A0", "A1", "A2", "A3" }, guardado.formato ?? "A0");
            if (formato == null) return;
            var sello = soloActualizar
                ? (guardado.sello == false ? "No" : "Si")
                : Opcion("¿Incluir el recuadro \"Sello aprobación proyecto\"?", new[] { "Si", "No" }, guardado.sello == false ? "No" : "Si");
            if (sello == null) return;
            var op = new OpcionesVineta { Formato = Nucleo.Formato.Buscar(formato), SelloAprobacion = sello == "Si" };

            var db = Doc.Database;
            var avisos = new List<string>();
            List<Lote> lotes;
            using (var tr0 = db.TransactionManager.StartOpenCloseTransaction()) lotes = Lotes.Todos(tr0, db, avisos);
            var dib = Nucleo.Vineta.Generar(datos, op, lotes.Count > 0 ? lotes : null);

            using (Doc.LockDocument())
            using (var tr = db.TransactionManager.StartTransaction())
            {
                var existentes = Referencias(tr, db);
                var nueva = true;
                if (soloActualizar) nueva = false;
                else if (existentes > 0)
                {
                    var r = Opcion($"Ya hay {existentes} viñeta(s) en el dibujo. ¿Qué hago?", new[] { "Actualizar", "Nueva" }, "Actualizar");
                    if (r == null) return;
                    nueva = r == "Nueva";
                }
                Point3dResultado punto = null;
                if (nueva)
                {
                    var pp = new PromptPointOptions("\nEsquina superior izquierda de la viñeta: ");
                    var res = Ed.GetPoint(pp);
                    if (res.Status != PromptStatus.OK) return;
                    punto = new Point3dResultado { Punto = res.Value.TransformBy(Ed.CurrentUserCoordinateSystem) };
                }

                var bloque = Dibujar.DefinirBloque(tr, db, BloqueVineta, dib);
                if (nueva)
                {
                    // En un layout (espacio papel) la viñeta va en mm; en el modelo, a la escala del plano (dibujo en metros)
                    var enModelo = db.TileMode || db.CurrentSpaceId == SymbolUtilityServices.GetBlockModelSpaceId(db);
                    var escala = enModelo ? (datos.Escala ?? 1000) / 1000.0 : 1.0;
                    Dibujar.Insertar(tr, db, db.CurrentSpaceId, bloque, punto.Punto, escala);
                    if (enModelo) Ed.WriteMessage($"\nInsertada en el espacio modelo a escala 1:{datos.Escala ?? 1000} (dibujo en metros).");
                }
                else
                {
                    ActualizarReferencias(tr, db);
                }
                Guardar(tr, db, datos.Id, datos.Codigo, formato, sello == "Si", datos.Escala);
                tr.Commit();
            }
            Ed.Regen();
            Ed.WriteMessage($"\nViñeta de {datos.Codigo} · {datos.Predio} lista.");
            if (dib.Faltantes.Count > 0)
                Ed.WriteMessage("\nFaltan datos en la app (quedaron en blanco): " + string.Join(", ", dib.Faltantes) +
                                ".\nComplétalos en el expediente y vuelve a ejecutar SPR_VINETA → Actualizar.");
            if (lotes.Count == 0) Ed.WriteMessage("\nSin cuadro de superficie: marca los lotes con SPR_LOTES y luego ejecuta SPR_CUADRO.");
            else InformarLotes(lotes, avisos);
            Ed.WriteMessage("\n");
        }

        static void InformarLotes(List<Lote> lotes, List<string> avisos)
        {
            var total = 0.0;
            foreach (var l in lotes) total += l.Superficie;
            Ed.WriteMessage($"\nCuadro de superficie: {lotes.Count} lote(s), total {Nucleo.Cuadro.Hectareas(total)} ha.");
            foreach (var a in avisos) Ed.WriteMessage("\nAviso: " + a);
        }

        sealed class Point3dResultado { public Autodesk.AutoCAD.Geometry.Point3d Punto; }

        // ── Ayudas ────────────────────────────────────────────────────────

        static bool PedirIngreso()
        {
            var c = Aplicacion.Cliente;
            var datos = Dialogos.Ingresar(c.Usuario);
            if (datos == null) return false;
            c.IniciarSesion(datos.Value.usuario, datos.Value.clave);
            Ed.WriteMessage($"\nHola, {c.NombreUsuario ?? c.Usuario}. Sesión iniciada (queda recordada en este equipo).\n");
            return true;
        }

        /// <summary>Elige el expediente del dibujo y lo guarda en él. Devuelve su id.</summary>
        static long? ElegirExpediente()
        {
            var c = Aplicacion.Cliente;
            if (!c.TieneSesion && !PedirIngreso()) return null;
            var lista = c.ListarExpedientes();
            if (lista.Count == 0) throw new ErrorUsuario("No hay expedientes en la app todavía.");
            var actual = Leer();
            var e = Dialogos.ElegirExpediente(lista, actual.id);
            if (e == null) return null;
            var db = Doc.Database;
            using (Doc.LockDocument())
            using (var tr = db.TransactionManager.StartTransaction())
            {
                Guardar(tr, db, e.Id, e.Codigo, actual.formato, actual.sello);
                tr.Commit();
            }
            Ed.WriteMessage($"\nEste dibujo quedó asociado a {e}.\n");
            return e.Id;
        }

        static string Opcion(string mensaje, string[] opciones, string porDefecto)
        {
            var o = new PromptKeywordOptions($"\n{mensaje} [{string.Join("/", opciones)}] <{porDefecto}>: ") { AllowNone = true };
            foreach (var x in opciones) o.Keywords.Add(x);
            o.Keywords.Default = porDefecto;
            var r = Ed.GetKeywords(o);
            if (r.Status == PromptStatus.None) return porDefecto;
            return r.Status == PromptStatus.OK ? r.StringResult : null;
        }

        static int Referencias(Transaction tr, Database db, string nombre = BloqueVineta)
        {
            var bt = (BlockTable)tr.GetObject(db.BlockTableId, OpenMode.ForRead);
            if (!bt.Has(nombre)) return 0;
            var btr = (BlockTableRecord)tr.GetObject(bt[nombre], OpenMode.ForRead);
            var n = 0;
            foreach (ObjectId id in btr.GetBlockReferenceIds(true, false))
                if (!tr.GetObject(id, OpenMode.ForRead).IsErased) n++;
            return n;
        }

        static void ActualizarReferencias(Transaction tr, Database db, string nombre = BloqueVineta)
        {
            var bt = (BlockTable)tr.GetObject(db.BlockTableId, OpenMode.ForRead);
            var btr = (BlockTableRecord)tr.GetObject(bt[nombre], OpenMode.ForRead);
            foreach (ObjectId id in btr.GetBlockReferenceIds(true, false))
            {
                var br = (BlockReference)tr.GetObject(id, OpenMode.ForWrite);
                br.RecordGraphicsModified(true);
            }
        }

        /// <summary>Expediente y opciones guardados dentro del DWG (diccionario EXPEDIENTES_SPR).</summary>
        static (long? id, string codigo, string formato, bool? sello) Leer()
        {
            var db = Doc.Database;
            using (var tr = db.TransactionManager.StartOpenCloseTransaction())
            {
                var nod = (DBDictionary)tr.GetObject(db.NamedObjectsDictionaryId, OpenMode.ForRead);
                if (!nod.Contains(ClaveDibujo)) return (null, null, null, null);
                var xr = tr.GetObject(nod.GetAt(ClaveDibujo), OpenMode.ForRead) as Xrecord;
                var v = xr?.Data?.AsArray();
                if (v == null || v.Length < 2) return (null, null, null, null);
                long.TryParse(Convert.ToString(v[0].Value, CultureInfo.InvariantCulture), NumberStyles.Integer, CultureInfo.InvariantCulture, out var id);
                string formato = v.Length > 2 ? Convert.ToString(v[2].Value) : null;
                bool? sello = v.Length > 3 ? Convert.ToString(v[3].Value) == "1" : (bool?)null;
                return (id > 0 ? id : (long?)null, Convert.ToString(v[1].Value), string.IsNullOrEmpty(formato) ? null : formato, sello);
            }
        }

        /// <summary>Escala del plano guardada al hacer la viñeta (para insertar en el modelo).</summary>
        static int? EscalaGuardada()
        {
            var db = Doc.Database;
            using (var tr = db.TransactionManager.StartOpenCloseTransaction())
            {
                var nod = (DBDictionary)tr.GetObject(db.NamedObjectsDictionaryId, OpenMode.ForRead);
                if (!nod.Contains(ClaveDibujo)) return null;
                var v = (tr.GetObject(nod.GetAt(ClaveDibujo), OpenMode.ForRead) as Xrecord)?.Data?.AsArray();
                return v != null && v.Length > 4 && int.TryParse(Convert.ToString(v[4].Value), out var e) && e > 0 ? e : (int?)null;
            }
        }

        static void Guardar(Transaction tr, Database db, long id, string codigo, string formato, bool? sello, int? escala = null)
        {
            var nod = (DBDictionary)tr.GetObject(db.NamedObjectsDictionaryId, OpenMode.ForWrite);
            Xrecord xr;
            if (nod.Contains(ClaveDibujo))
            {
                xr = (Xrecord)tr.GetObject(nod.GetAt(ClaveDibujo), OpenMode.ForWrite);
                // Sin escala nueva se conserva la que había
                var v = xr.Data?.AsArray();
                if (escala == null && v != null && v.Length > 4 && int.TryParse(Convert.ToString(v[4].Value), out var e) && e > 0) escala = e;
            }
            else
            {
                xr = new Xrecord();
                nod.SetAt(ClaveDibujo, xr);
                tr.AddNewlyCreatedDBObject(xr, true);
            }
            xr.Data = new ResultBuffer(
                new TypedValue((int)DxfCode.Text, id.ToString(CultureInfo.InvariantCulture)),
                new TypedValue((int)DxfCode.Text, codigo ?? ""),
                new TypedValue((int)DxfCode.Text, formato ?? ""),
                new TypedValue((int)DxfCode.Text, sello == false ? "0" : "1"),
                new TypedValue((int)DxfCode.Text, escala?.ToString(CultureInfo.InvariantCulture) ?? ""));
        }
    }
}
