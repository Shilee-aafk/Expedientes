using System;
using System.IO;
using Autodesk.AutoCAD.Colors;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.Geometry;
using ExpedientesSPR.Nucleo;

namespace ExpedientesSPR
{
    /// <summary>Pasa un <see cref="Dibujo"/> del núcleo a entidades de AutoCAD dentro de un bloque.</summary>
    static class Dibujar
    {
        public const string Capa = "SP-VINETA";
        public const string EstiloTexto = "SP-ROMANS";

        /// <summary>
        /// Crea o redefine el bloque <paramref name="nombreBloque"/> con el dibujo (en mm de papel, origen arriba a la izquierda).
        /// Las referencias que ya existan se actualizan solas.
        /// </summary>
        public static ObjectId DefinirBloque(Transaction tr, Database db, string nombreBloque, Dibujo dib)
        {
            var capa = AsegurarCapa(tr, db, Capa, 7);
            var estilo = AsegurarEstilo(tr, db);
            var bt = (BlockTable)tr.GetObject(db.BlockTableId, OpenMode.ForRead);
            BlockTableRecord btr;
            if (bt.Has(nombreBloque))
            {
                btr = (BlockTableRecord)tr.GetObject(bt[nombreBloque], OpenMode.ForWrite);
                foreach (ObjectId id in btr)
                    tr.GetObject(id, OpenMode.ForWrite).Erase();
            }
            else
            {
                bt.UpgradeOpen();
                btr = new BlockTableRecord { Name = nombreBloque, Origin = Point3d.Origin };
                bt.Add(btr);
                tr.AddNewlyCreatedDBObject(btr, true);
            }
            btr.Comments = "Generado por el plugin Expedientes SPR. Se reemplaza al volver a ejecutar el comando.";

            foreach (var e in dib.Elementos)
            {
                Entity ent = null;
                switch (e)
                {
                    case Linea l:
                        ent = new Line(new Point3d(l.X1, l.Y1, 0), new Point3d(l.X2, l.Y2, 0));
                        break;
                    case Texto t:
                        var mt = new MText
                        {
                            Location = new Point3d(t.X, t.Y, 0),
                            TextHeight = t.Altura,
                            TextStyleId = estilo,
                            Attachment = t.Alineacion == Alineacion.CentroMedio ? AttachmentPoint.MiddleCenter : AttachmentPoint.MiddleLeft,
                            Contents = Escapar(t.Contenido),
                        };
                        if (t.Ancho > 0) mt.Width = t.Ancho;
                        ent = mt;
                        break;
                    case Imagen im:
                        ent = Logo(tr, db, im);
                        break;
                }
                if (ent == null) continue;
                // Capa 0 y color "por bloque": el bloque toma la capa y el color de la referencia
                ent.SetDatabaseDefaults(db);
                ent.Layer = "0";
                if (!(ent is RasterImage)) ent.ColorIndex = 0;
                btr.AppendEntity(ent);
                tr.AddNewlyCreatedDBObject(ent, true);
                if (ent is RasterImage ri && e is Imagen) ri.AssociateRasterDef((RasterImageDef)tr.GetObject(ri.ImageDefId, OpenMode.ForWrite));
            }
            return btr.ObjectId;
        }

        /// <summary>El logo SP como imagen (igual que en los planos actuales), desde la carpeta Recursos del plugin.</summary>
        static RasterImage Logo(Transaction tr, Database db, Imagen im)
        {
            var archivo = Path.Combine(Aplicacion.CarpetaContenido, "Recursos", im.Nombre + ".png");
            if (!File.Exists(archivo)) return null;
            var dictId = RasterImageDef.GetImageDictionary(db);
            if (dictId.IsNull) dictId = RasterImageDef.CreateImageDictionary(db);
            var dict = (DBDictionary)tr.GetObject(dictId, OpenMode.ForWrite);
            const string clave = "SP_LOGO";
            RasterImageDef def;
            if (dict.Contains(clave))
            {
                def = (RasterImageDef)tr.GetObject(dict.GetAt(clave), OpenMode.ForWrite);
                if (!string.Equals(def.SourceFileName, archivo, StringComparison.OrdinalIgnoreCase)) def.SourceFileName = archivo;
            }
            else
            {
                def = new RasterImageDef { SourceFileName = archivo };
                dict.SetAt(clave, def);
                tr.AddNewlyCreatedDBObject(def, true);
            }
            def.Load();
            var img = new RasterImage
            {
                ImageDefId = def.ObjectId,
                Orientation = new CoordinateSystem3d(new Point3d(im.X, im.Y, 0), new Vector3d(im.Ancho, 0, 0), new Vector3d(0, im.Alto, 0)),
                ShowImage = true,
            };
            return img;
        }

        /// <summary>Inserta una referencia del bloque; en espacio modelo se escala según la escala del plano.</summary>
        public static ObjectId Insertar(Transaction tr, Database db, ObjectId espacio, ObjectId bloque, Point3d punto, double escala)
        {
            var bref = new BlockReference(punto, bloque) { ScaleFactors = new Scale3d(escala) };
            bref.SetDatabaseDefaults(db);
            bref.Layer = Capa;
            var btr = (BlockTableRecord)tr.GetObject(espacio, OpenMode.ForWrite);
            btr.AppendEntity(bref);
            tr.AddNewlyCreatedDBObject(bref, true);
            return bref.ObjectId;
        }

        public static ObjectId AsegurarCapa(Transaction tr, Database db, string nombre, short color)
        {
            var lt = (LayerTable)tr.GetObject(db.LayerTableId, OpenMode.ForRead);
            if (lt.Has(nombre)) return lt[nombre];
            lt.UpgradeOpen();
            var c = new LayerTableRecord { Name = nombre, Color = Color.FromColorIndex(ColorMethod.ByAci, color) };
            var id = lt.Add(c);
            tr.AddNewlyCreatedDBObject(c, true);
            return id;
        }

        static ObjectId AsegurarEstilo(Transaction tr, Database db)
        {
            var ts = (TextStyleTable)tr.GetObject(db.TextStyleTableId, OpenMode.ForRead);
            if (ts.Has(EstiloTexto)) return ts[EstiloTexto];
            ts.UpgradeOpen();
            var e = new TextStyleTableRecord { Name = EstiloTexto, FileName = "romans.shx", XScale = 1.0, TextSize = 0 };
            var id = ts.Add(e);
            tr.AddNewlyCreatedDBObject(e, true);
            return id;
        }

        /// <summary>El texto de MText interpreta \ { } como códigos de formato: se escapan.</summary>
        public static string Escapar(string s) =>
            (s ?? "").Replace("\\", "\\\\").Replace("{", "\\{").Replace("}", "\\}").Replace("\r\n", "\\P").Replace("\n", "\\P");
    }
}
