using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;
using Autodesk.AutoCAD.DatabaseServices;
using ExpedientesSPR.Nucleo;

namespace ExpedientesSPR
{
    /// <summary>
    /// Lotes del dibujo: polilíneas cerradas marcadas con SPR_LOTES. Su nombre, la polilínea de
    /// su servidumbre y el ancho se guardan en la misma polilínea (datos extendidos), así que
    /// si se mueve un vértice el cuadro se recalcula con la superficie nueva.
    /// </summary>
    static class Lotes
    {
        public const string App = "EXPEDIENTES_SPR";
        const string Marca = "LOTE";

        public sealed class Marcado
        {
            public ObjectId Id;
            public string Nombre;
            public Handle? Servidumbre;
            public double? Ancho;
        }

        static void RegistrarApp(Transaction tr, Database db)
        {
            var rat = (RegAppTable)tr.GetObject(db.RegAppTableId, OpenMode.ForRead);
            if (rat.Has(App)) return;
            rat.UpgradeOpen();
            var r = new RegAppTableRecord { Name = App };
            rat.Add(r);
            tr.AddNewlyCreatedDBObject(r, true);
        }

        public static Marcado Leer(Entity e)
        {
            var datos = e.GetXDataForApplication(App)?.AsArray();
            if (datos == null || datos.Length < 3 || Convert.ToString(datos[1].Value) != Marca) return null;
            var m = new Marcado { Id = e.ObjectId, Nombre = Convert.ToString(datos[2].Value) };
            foreach (var v in datos)
            {
                if (v.TypeCode == (short)DxfCode.ExtendedDataHandle)
                {
                    if (v.Value is Handle hh) m.Servidumbre = hh;
                    else if (v.Value is string h && h.Length > 0)
                        m.Servidumbre = new Handle(long.Parse(h, NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                }
                if (v.TypeCode == (short)DxfCode.ExtendedDataReal && v.Value is double a && a > 0) m.Ancho = a;
            }
            return m;
        }

        public static void Guardar(Transaction tr, Database db, Polyline lote, string nombre, Polyline servidumbre, double? ancho)
        {
            RegistrarApp(tr, db);
            var datos = new List<TypedValue>
            {
                new TypedValue((int)DxfCode.ExtendedDataRegAppName, App),
                new TypedValue((int)DxfCode.ExtendedDataAsciiString, Marca),
                new TypedValue((int)DxfCode.ExtendedDataAsciiString, nombre),
            };
            if (servidumbre != null)
            {
                datos.Add(new TypedValue((int)DxfCode.ExtendedDataHandle, servidumbre.Handle.ToString()));
                datos.Add(new TypedValue((int)DxfCode.ExtendedDataReal, ancho ?? 0));
            }
            if (!lote.IsWriteEnabled) lote.UpgradeOpen();
            lote.XData = new ResultBuffer(datos.ToArray());
        }

        /// <summary>Todos los lotes del espacio modelo con sus superficies. Avisos: lo que no se pudo medir bien.</summary>
        public static List<Lote> Todos(Transaction tr, Database db, List<string> avisos)
        {
            var lotes = new List<Lote>();
            var modelo = (BlockTableRecord)tr.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(db), OpenMode.ForRead);
            foreach (ObjectId id in modelo)
            {
                if (!id.ObjectClass.IsDerivedFrom(Autodesk.AutoCAD.Runtime.RXObject.GetClass(typeof(Polyline)))) continue;
                var pl = (Polyline)tr.GetObject(id, OpenMode.ForRead);
                var m = Leer(pl);
                if (m == null) continue;
                if (!Cerrada(pl)) avisos.Add($"«{m.Nombre}» no es una polilínea cerrada: su superficie puede no ser la correcta.");
                var lote = new Lote { Nombre = m.Nombre, Superficie = pl.Area };
                if (m.Servidumbre.HasValue)
                {
                    var sid = ObjectId.Null;
                    try { sid = db.GetObjectId(false, m.Servidumbre.Value, 0); } catch (Autodesk.AutoCAD.Runtime.Exception) { }
                    if (!sid.IsNull && !sid.IsErased && tr.GetObject(sid, OpenMode.ForRead) is Polyline sv)
                    {
                        lote.Servidumbre = sv.Area;
                        lote.AnchoServidumbre = m.Ancho;
                    }
                    else avisos.Add($"La servidumbre de «{m.Nombre}» ya no existe en el dibujo.");
                }
                lotes.Add(lote);
            }
            return lotes;
        }

        public static bool Cerrada(Polyline pl) =>
            pl.Closed || (pl.NumberOfVertices > 2 && pl.GetPoint2dAt(0).GetDistanceTo(pl.GetPoint2dAt(pl.NumberOfVertices - 1)) < 1e-6);

        /// <summary>"Lote b-4" → "Lote b-5"; "Lote 3" → "Lote 4"; sin número → mismo nombre + " 2"</summary>
        public static string Siguiente(string nombre)
        {
            if (string.IsNullOrWhiteSpace(nombre)) return "Lote 1";
            var m = Regex.Match(nombre, @"^(.*?)(\d+)(\D*)$");
            if (!m.Success) return nombre + "-1";
            var n = long.Parse(m.Groups[2].Value, CultureInfo.InvariantCulture) + 1;
            return m.Groups[1].Value + n.ToString(CultureInfo.InvariantCulture) + m.Groups[3].Value;
        }
    }
}
