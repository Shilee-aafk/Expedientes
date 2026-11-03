using System.Collections.Generic;

namespace ExpedientesSPR.Nucleo
{
    /// <summary>Fila de la lista de expedientes (para elegir uno).</summary>
    public sealed class ExpedienteResumen
    {
        public long Id;
        public string Codigo;
        public string Predio;
        public string Comuna;
        public override string ToString() => $"{Codigo} · {Predio}" + (string.IsNullOrEmpty(Comuna) ? "" : $" ({Comuna})");
    }

    public sealed class Dueno
    {
        public string Nombre;
        public string Rut;
        public string ApoderadoNombre;
        public string ApoderadoRut;
    }

    public sealed class Profesional
    {
        public string Nombre;
        public string Rut;
        public string Profesion;
    }

    /// <summary>Todo lo que la viñeta necesita de un expediente.</summary>
    public sealed class DatosPlano
    {
        public long Id;
        public string Codigo;
        public string Predio;
        public string RolSii;
        public string Comuna;
        public string Sector;
        public string Provincia;
        public string Region;
        public string InscripcionFojas;
        public string InscripcionNumero;
        public string InscripcionAnio;
        public string Conservador;
        public string PlanoBase;
        public string Lamina;
        public int? Escala;
        public double? AccesoNorte;
        public double? AccesoEste;
        public string Huso;
        public List<Dueno> Duenos = new List<Dueno>();
        public Profesional Profesional;

        public static DatosPlano DesdeJson(IDictionary<string, object> o)
        {
            var d = new DatosPlano
            {
                Id = (long)(o.Numero("id") ?? 0),
                Codigo = o.Texto("codigo"),
                Predio = o.Texto("predio"),
                RolSii = o.Texto("rol_sii"),
                Comuna = o.Texto("comuna"),
                Sector = o.Texto("sector"),
                Provincia = o.Texto("provincia"),
                Region = o.Texto("region"),
                InscripcionFojas = o.Texto("inscripcion_fojas"),
                InscripcionNumero = o.Texto("inscripcion_numero"),
                InscripcionAnio = o.Texto("inscripcion_anio"),
                Conservador = o.Texto("conservador"),
                PlanoBase = o.Texto("plano_base"),
                Lamina = o.Texto("lamina"),
                Escala = o.Numero("escala") is double e ? (int?)e : null,
                AccesoNorte = o.Numero("acceso_norte"),
                AccesoEste = o.Numero("acceso_este"),
                Huso = o.Texto("huso"),
            };
            var duenos = new List<(double id, Dueno d)>();
            foreach (var x in o.Lista("duenos"))
                duenos.Add((x.Numero("id") ?? 0, new Dueno
                {
                    Nombre = x.Texto("nombre"),
                    Rut = x.Texto("rut"),
                    ApoderadoNombre = x.Texto("apoderado_nombre"),
                    ApoderadoRut = x.Texto("apoderado_rut"),
                }));
            duenos.Sort((a, b) => a.id.CompareTo(b.id));
            foreach (var x in duenos) d.Duenos.Add(x.d);
            var p = o.Objeto("profesional");
            if (p != null) d.Profesional = new Profesional { Nombre = p.Texto("nombre"), Rut = p.Texto("rut"), Profesion = p.Texto("profesion") };
            return d;
        }
    }
}
