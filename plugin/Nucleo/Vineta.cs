using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace ExpedientesSPR.Nucleo
{
    public sealed class Formato
    {
        public string Nombre;
        public int Largo, Corto;
        public override string ToString() => $"{Nombre} ({Largo} x {Corto})";

        public static readonly Formato[] Todos =
        {
            new Formato { Nombre = "A0", Largo = 1189, Corto = 841 },
            new Formato { Nombre = "A1", Largo = 841, Corto = 594 },
            new Formato { Nombre = "A2", Largo = 594, Corto = 420 },
            new Formato { Nombre = "A3", Largo = 420, Corto = 297 },
        };

        public static Formato Buscar(string nombre) =>
            Todos.FirstOrDefault(f => string.Equals(f.Nombre, (nombre ?? "").Trim(), StringComparison.OrdinalIgnoreCase)) ?? Todos[0];
    }

    public sealed class OpcionesVineta
    {
        public Formato Formato = Formato.Todos[0];
        /// <summary>Ancho total de la viñeta en mm de papel.</summary>
        public double Ancho = 215;
        /// <summary>Proporción del ancho que ocupa la columna izquierda.</summary>
        public double ColumnaIzquierda = 0.535;
        public double AlturaTexto = 3.0;
        public double AltoFilaMinimo = 10;
        public double AltoLogo = 45;
        public bool SelloAprobacion = true;
        public double AltoSello = 70;
    }

    /// <summary>
    /// Viñeta del plano de subdivisión con el formato de Sánchez Paz: datos del predio,
    /// propietarios (con "por poder"), profesional, lámina, empresa responsable y sello.
    /// Origen en la esquina superior izquierda; crece hacia abajo (y negativa).
    /// </summary>
    public static class Vineta
    {
        sealed class Celda
        {
            public string Etiqueta, Valor;
            public Celda(string etiqueta, string valor) { Etiqueta = etiqueta; Valor = valor; }
            public string Texto => Valor == null ? Etiqueta : $"{Etiqueta} {Valor}";
        }

        /// <param name="lotes">Lotes del dibujo: si hay, el cuadro de superficie va dentro de la viñeta (bajo la lámina).</param>
        public static Dibujo Generar(DatosPlano d, OpcionesVineta op, IEnumerable<Lote> lotes = null)
        {
            var dib = new Dibujo { Ancho = op.Ancho };
            var filas = new List<Celda[]>();
            void Fila(params Celda[] c) => filas.Add(c);
            string Dato(string valor, string nombre)
            {
                if (string.IsNullOrWhiteSpace(valor)) { dib.Faltantes.Add(nombre); return ""; }
                return valor.Trim();
            }

            Fila(new Celda("NOMBRE DEL PREDIO:", Dato(d.Predio, "nombre del predio")), new Celda("N° ROL DE AVALÚO:", Dato(d.RolSii, "rol de avalúo")));
            Fila(new Celda("REGIÓN:", Dato(d.Region, "región")?.ToUpper(CultureInfo.CurrentCulture)), new Celda("PROVINCIA:", Dato(d.Provincia, "provincia")?.ToUpper(CultureInfo.CurrentCulture)));
            Fila(new Celda("COMUNA:", Dato(d.Comuna, "comuna")?.ToUpper(CultureInfo.CurrentCulture)), new Celda("SECTOR:", Dato(d.Sector, "sector")?.ToUpper(CultureInfo.CurrentCulture)));
            Fila(new Celda("INSCRIPCIÓN DE DOMINIO:", Inscripcion(d, dib)), new Celda("PLANO BASE:", string.IsNullOrWhiteSpace(d.PlanoBase) ? "" : d.PlanoBase.Trim()));
            Fila(new Celda("FORMATO:", $"{op.Formato.Nombre} ({op.Formato.Largo} x {op.Formato.Corto} mm)"),
                 new Celda("ESCALA NOMINAL:", "1:" + (d.Escala ?? 1000).ToString(CultureInfo.InvariantCulture)));

            if (d.Duenos.Count == 0) dib.Faltantes.Add("propietarios");
            foreach (var du in d.Duenos)
            {
                var poder = !string.IsNullOrWhiteSpace(du.ApoderadoNombre);
                Fila(new Celda("NOMBRE DEL PROPIETARIO:", Dato(du.Nombre, "nombre de propietario").ToUpper(CultureInfo.CurrentCulture)));
                Fila(new Celda("N° CÉDULA DE IDENTIDAD:", Dato(du.Rut, $"RUT de {du.Nombre}")), new Celda(poder ? "" : "FIRMA :", null));
                if (poder)
                {
                    Fila(new Celda("POR PODER:", du.ApoderadoNombre.Trim().ToUpper(CultureInfo.CurrentCulture)));
                    Fila(new Celda("N° CÉDULA DE IDENTIDAD:", Dato(du.ApoderadoRut, $"RUT de {du.ApoderadoNombre}")), new Celda("FIRMA :", null));
                }
            }

            var pr = d.Profesional ?? new Profesional();
            if (d.Profesional == null) dib.Faltantes.Add("profesional");
            Fila(new Celda("NOMBRE DEL PROFESIONAL:", Dato(pr.Nombre, "nombre del profesional").ToUpper(CultureInfo.CurrentCulture)),
                 new Celda("PROFESIÓN:", Dato(pr.Profesion, "profesión del profesional (Mi perfil)").ToUpper(CultureInfo.CurrentCulture)));
            Fila(new Celda("N° CÉDULA DE IDENTIDAD:", Dato(pr.Rut, "RUT del profesional (Mi perfil)")), new Celda("FIRMA :", null));
            Fila(new Celda("LÁMINA:", string.IsNullOrWhiteSpace(d.Lamina) ? "A" : d.Lamina.Trim().ToUpper(CultureInfo.CurrentCulture)));

            // ── Dibujo de las filas ──
            double y = 0, w = op.Ancho, xc = Math.Round(w * op.ColumnaIzquierda, 1), h = op.AlturaTexto, pad = 2;
            dib.Linea(0, 0, w, 0);
            foreach (var f in filas)
            {
                var anchos = f.Length == 1 ? new[] { w } : new[] { xc, w - xc };
                var lineas = f.Select((c, i) => Lineas(c.Texto, anchos[i] - 2 * pad, h)).Max();
                var alto = Math.Max(op.AltoFilaMinimo, Math.Ceiling(lineas * h * 1.55 + 2 * pad + 1));
                var x = 0.0;
                for (var i = 0; i < f.Length; i++)
                {
                    if (f[i].Texto.Length > 0)
                        dib.Texto(x + pad, y - alto / 2, h, f[i].Texto, Alineacion.IzquierdaMedio, anchos[i] - 2 * pad);
                    x += anchos[i];
                }
                if (f.Length == 2) dib.Linea(xc, y, xc, y - alto);
                y -= alto;
                dib.Linea(0, y, w, y);
            }

            if (lotes != null) y = Cuadro.Agregar(dib, y, w, h, lotes);

            // Empresa responsable con el logo
            var altoEmpresa = op.AltoLogo + 22;
            dib.Texto(w / 2, y - 6, h * 1.5, "EMPRESA RESPONSABLE", Alineacion.CentroMedio);
            dib.Texto(w / 2, y - 6 - h * 2.1, h * 1.5, "DEL PROYECTO", Alineacion.CentroMedio);
            var anchoLogo = Math.Min(w - 40, op.AltoLogo * 813.0 / 444.0);
            var altoLogo = anchoLogo * 444.0 / 813.0;
            dib.Elementos.Add(new Imagen { X = (w - anchoLogo) / 2, Y = y - altoEmpresa + 4, Ancho = anchoLogo, Alto = altoLogo, Nombre = "logo-sp" });
            y -= altoEmpresa;
            dib.Linea(0, y, w, y);

            if (op.SelloAprobacion)
            {
                dib.Texto(w / 2, y - 6, h * 1.5, "SELLO APROBACIÓN", Alineacion.CentroMedio);
                dib.Texto(w / 2, y - 6 - h * 2.1, h * 1.5, "PROYECTO", Alineacion.CentroMedio);
                y -= op.AltoSello;
                dib.Linea(0, y, w, y);
            }

            dib.Linea(0, 0, 0, y);
            dib.Linea(w, 0, w, y);
            dib.Alto = -y;
            return dib;
        }

        /// <summary>"Fs 5400v N° 7033 Año 2016 Inscritos en el Conservador De Bienes Raíces de Puerto Montt"</summary>
        public static string Inscripcion(DatosPlano d, Dibujo dib = null)
        {
            var partes = new List<string>();
            if (!string.IsNullOrWhiteSpace(d.InscripcionFojas)) partes.Add("Fs " + d.InscripcionFojas.Trim());
            if (!string.IsNullOrWhiteSpace(d.InscripcionNumero)) partes.Add("N° " + d.InscripcionNumero.Trim());
            if (!string.IsNullOrWhiteSpace(d.InscripcionAnio)) partes.Add("Año " + d.InscripcionAnio.Trim());
            if (partes.Count == 0) dib?.Faltantes.Add("inscripción de dominio");
            if (!string.IsNullOrWhiteSpace(d.Conservador))
                partes.Add("Inscritos en el Conservador De Bienes Raíces de " + d.Conservador.Trim());
            else if (partes.Count > 0) dib?.Faltantes.Add("conservador");
            return string.Join(" ", partes);
        }

        /// <summary>Líneas aproximadas que ocupa un texto (letra romans en mayúsculas: ~0,85 de la altura por carácter, con margen).</summary>
        public static int Lineas(string texto, double ancho, double altura)
        {
            if (string.IsNullOrEmpty(texto)) return 1;
            var porLinea = Math.Max(1, (int)Math.Floor(ancho / (altura * 0.85)));
            var lineas = 1;
            var largo = 0;
            foreach (var palabra in texto.Split(' '))
            {
                var p = palabra.Length;
                if (largo == 0) largo = p;
                else if (largo + 1 + p <= porLinea) largo += 1 + p;
                else { lineas++; largo = p; }
                while (largo > porLinea) { lineas++; largo -= porLinea; }
            }
            return lineas;
        }
    }
}
