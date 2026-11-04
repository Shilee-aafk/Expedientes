using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;

namespace ExpedientesSPR.Nucleo
{
    /// <summary>Lote resultante tomado del dibujo (superficies en m², del área de las polilíneas).</summary>
    public sealed class Lote
    {
        public string Nombre;
        public double Superficie;
        /// <summary>Superficie de la servidumbre dentro del lote (null si no tiene)</summary>
        public double? Servidumbre;
        /// <summary>Ancho de la servidumbre en metros (null si no tiene)</summary>
        public double? AnchoServidumbre;
    }

    /// <summary>
    /// Cuadro de superficie del plano: nombre del lote resultante, superficie (ha), superficie de
    /// servidumbre (ha), ancho de servidumbre y total. Las cifras salen del dibujo, no se escriben a mano.
    /// </summary>
    public static class Cuadro
    {
        static readonly NumberFormatInfo Chile = new NumberFormatInfo { NumberDecimalSeparator = ",", NumberGroupSeparator = "." };

        /// <summary>m² → "12,2923" (hectáreas con 4 decimales, coma decimal)</summary>
        public static string Hectareas(double m2, int decimales = 4) =>
            (m2 / 10000).ToString("N" + decimales.ToString(CultureInfo.InvariantCulture), Chile);

        /// <summary>6 → "6 m"; 2.5 → "2,5 m"</summary>
        public static string Metros(double m) => m.ToString("0.##", Chile) + " m";

        /// <summary>Orden natural: "Lote b", "Lote b-1", "Lote b-2", …, "Lote b-10", "Lote b-12"</summary>
        public static int CompararNombres(string a, string b)
        {
            var pa = Regex.Split(a ?? "", @"(\d+)");
            var pb = Regex.Split(b ?? "", @"(\d+)");
            for (var i = 0; i < Math.Min(pa.Length, pb.Length); i++)
            {
                int c;
                if (i % 2 == 1 && long.TryParse(pa[i], out var na) && long.TryParse(pb[i], out var nb)) c = na.CompareTo(nb);
                else c = string.Compare(pa[i], pb[i], StringComparison.CurrentCultureIgnoreCase);
                if (c != 0) return c;
            }
            return pa.Length.CompareTo(pb.Length);
        }

        public static List<Lote> Ordenar(IEnumerable<Lote> lotes)
        {
            var l = lotes.ToList();
            l.Sort((x, y) => CompararNombres(x.Nombre, y.Nombre));
            return l;
        }

        /// <summary>Cuadro solo (con su marco), para ponerlo fuera de la viñeta.</summary>
        public static Dibujo Generar(IEnumerable<Lote> lotes, OpcionesVineta op)
        {
            var dib = new Dibujo { Ancho = op.Ancho };
            dib.Linea(0, 0, op.Ancho, 0);
            var y = Agregar(dib, 0, op.Ancho, op.AlturaTexto, lotes);
            dib.Linea(0, 0, 0, y);
            dib.Linea(op.Ancho, 0, op.Ancho, y);
            dib.Alto = -y;
            return dib;
        }

        /// <summary>Dibuja el cuadro desde la altura y (hacia abajo) y devuelve la nueva altura.</summary>
        public static double Agregar(Dibujo dib, double y, double w, double h, IEnumerable<Lote> lotes)
        {
            var lista = Ordenar(lotes);
            if (lista.Count == 0) return y;
            // Columnas como en los planos de SP
            var p = new[] { 0.25, 0.24, 0.27, 0.24 };
            var x = new double[5];
            for (var i = 0; i < 4; i++) x[i + 1] = x[i] + Math.Round(w * p[i], 1);
            x[4] = w;
            double Centro(int c) => (x[c] + x[c + 1]) / 2;

            // Título
            var alto = 10.0;
            dib.Texto(w / 2, y - alto / 2, h, "CUADRO DE SUPERFICIE", Alineacion.CentroMedio);
            y -= alto;
            dib.Linea(0, y, w, y);

            void Fila(double altoFila, double hTexto, params string[] celdas)
            {
                for (var c = 0; c < 4; c++)
                    if (!string.IsNullOrEmpty(celdas[c]))
                        dib.Texto(Centro(c), y - altoFila / 2, hTexto, celdas[c], Alineacion.CentroMedio, x[c + 1] - x[c] - 2);
                for (var c = 1; c < 4; c++) dib.Linea(x[c], y, x[c], y - altoFila);
                y -= altoFila;
                dib.Linea(0, y, w, y);
            }

            Fila(13, h * 0.9, "NOMBRE DEL\nLOTE RESULTANTE", "SUPERFICIE HA", "SUPERFICIE\nSERVIDUMBRE HA", "ANCHO\nSERVIDUMBRE");
            foreach (var l in lista)
            {
                var conServ = l.Servidumbre.HasValue && l.Servidumbre.Value > 0;
                Fila(10, h, l.Nombre ?? "",
                     Hectareas(l.Superficie),
                     conServ ? Hectareas(l.Servidumbre.Value) : "---",
                     conServ && l.AnchoServidumbre.HasValue ? Metros(l.AnchoServidumbre.Value) : "---");
            }
            var totalServ = lista.Where(l => l.Servidumbre.HasValue).Sum(l => l.Servidumbre.Value);
            Fila(12, h, "TOTAL\nSUPERFICIE", Hectareas(lista.Sum(l => l.Superficie)), totalServ > 0 ? Hectareas(totalServ) : "---", "---");
            return y;
        }
    }
}
