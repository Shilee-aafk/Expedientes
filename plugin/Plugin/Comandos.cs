using System;
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
        public void Vineta() => Ejecutar("SPR_VINETA", () =>
        {
            var guardado = Leer();
            var id = guardado.id ?? ElegirExpediente();
            if (id == null) return;
            var datos = Aplicacion.Cliente.CargarExpediente(id.Value);

            // Formato y sello: se recuerdan en el dibujo
            var formato = Opcion("Formato de la hoja", new[] { "A0", "A1", "A2", "A3" }, guardado.formato ?? "A0");
            if (formato == null) return;
            var sello = Opcion("¿Incluir el recuadro \"Sello aprobación proyecto\"?", new[] { "Si", "No" }, guardado.sello == false ? "No" : "Si");
            if (sello == null) return;
            var op = new OpcionesVineta { Formato = Nucleo.Formato.Buscar(formato), SelloAprobacion = sello == "Si" };
            var dib = Nucleo.Vineta.Generar(datos, op);

            var db = Doc.Database;
            using (Doc.LockDocument())
            using (var tr = db.TransactionManager.StartTransaction())
            {
                var existentes = Referencias(tr, db);
                var nueva = true;
                if (existentes > 0)
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
                Guardar(tr, db, datos.Id, datos.Codigo, formato, sello == "Si");
                tr.Commit();
            }
            Ed.Regen();
            Ed.WriteMessage($"\nViñeta de {datos.Codigo} · {datos.Predio} lista.");
            if (dib.Faltantes.Count > 0)
                Ed.WriteMessage("\nFaltan datos en la app (quedaron en blanco): " + string.Join(", ", dib.Faltantes) +
                                ".\nComplétalos en el expediente y vuelve a ejecutar SPR_VINETA → Actualizar.");
            Ed.WriteMessage("\n");
        });

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

        static int Referencias(Transaction tr, Database db)
        {
            var bt = (BlockTable)tr.GetObject(db.BlockTableId, OpenMode.ForRead);
            if (!bt.Has(BloqueVineta)) return 0;
            var btr = (BlockTableRecord)tr.GetObject(bt[BloqueVineta], OpenMode.ForRead);
            var n = 0;
            foreach (ObjectId id in btr.GetBlockReferenceIds(true, false))
                if (!tr.GetObject(id, OpenMode.ForRead).IsErased) n++;
            return n;
        }

        static void ActualizarReferencias(Transaction tr, Database db)
        {
            var bt = (BlockTable)tr.GetObject(db.BlockTableId, OpenMode.ForRead);
            var btr = (BlockTableRecord)tr.GetObject(bt[BloqueVineta], OpenMode.ForRead);
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

        static void Guardar(Transaction tr, Database db, long id, string codigo, string formato, bool? sello)
        {
            var nod = (DBDictionary)tr.GetObject(db.NamedObjectsDictionaryId, OpenMode.ForWrite);
            Xrecord xr;
            if (nod.Contains(ClaveDibujo)) xr = (Xrecord)tr.GetObject(nod.GetAt(ClaveDibujo), OpenMode.ForWrite);
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
                new TypedValue((int)DxfCode.Text, sello == false ? "0" : "1"));
        }
    }
}
