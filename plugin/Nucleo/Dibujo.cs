using System.Collections.Generic;

namespace ExpedientesSPR.Nucleo
{
    public enum Alineacion { IzquierdaMedio, CentroMedio }

    /// <summary>Elemento de dibujo en milímetros de papel, sin depender de AutoCAD (se puede probar).</summary>
    public abstract class Elemento { }

    public sealed class Linea : Elemento
    {
        public double X1, Y1, X2, Y2;
        public Linea(double x1, double y1, double x2, double y2) { X1 = x1; Y1 = y1; X2 = x2; Y2 = y2; }
    }

    /// <summary>Texto de una o varias líneas. Con Ancho &gt; 0 AutoCAD lo corta en líneas dentro de ese ancho.</summary>
    public sealed class Texto : Elemento
    {
        public double X, Y, Altura, Ancho;
        public string Contenido;
        public Alineacion Alineacion;
    }

    /// <summary>Imagen (el logo) ocupando el rectángulo dado; la esquina es la inferior izquierda.</summary>
    public sealed class Imagen : Elemento
    {
        public double X, Y, Ancho, Alto;
        public string Nombre;
    }

    public sealed class Dibujo
    {
        public readonly List<Elemento> Elementos = new List<Elemento>();
        public double Ancho, Alto;
        /// <summary>Datos que faltan en el expediente (para avisar).</summary>
        public readonly List<string> Faltantes = new List<string>();

        public void Linea(double x1, double y1, double x2, double y2) => Elementos.Add(new Linea(x1, y1, x2, y2));

        public void Rectangulo(double x, double y, double ancho, double alto)
        {
            Linea(x, y, x + ancho, y);
            Linea(x + ancho, y, x + ancho, y + alto);
            Linea(x + ancho, y + alto, x, y + alto);
            Linea(x, y + alto, x, y);
        }

        public void Texto(double x, double y, double altura, string contenido, Alineacion al = Alineacion.IzquierdaMedio, double ancho = 0) =>
            Elementos.Add(new Texto { X = x, Y = y, Altura = altura, Contenido = contenido, Alineacion = al, Ancho = ancho });
    }
}
