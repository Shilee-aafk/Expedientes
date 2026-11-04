using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using ExpedientesSPR.Nucleo;
using Xunit;

public class PruebasJson
{
    [Fact]
    public void LeeYEscribe()
    {
        var o = (IDictionary<string, object>)Json.Leer("{\"a\":1.5,\"b\":[true,null,\"x\\n\\u00e1\"],\"c\":{}}");
        Assert.Equal(1.5, o.Numero("a"));
        var b = (List<object>)o["b"];
        Assert.Equal(true, b[0]);
        Assert.Null(b[1]);
        Assert.Equal("x\ná", b[2]);
        Assert.Equal("{\"t\":\"a\\\"b\",\"n\":2}", Json.Escribir(new Dictionary<string, object> { ["t"] = "a\"b", ["n"] = 2 }));
        Assert.Throws<FormatException>(() => Json.Leer("{\"a\":}"));
    }
}

public class PruebasUsuarios
{
    [Theory]
    [InlineData("jesusmsanchez", "jesusmsanchez@expedientes-spr.local")]
    [InlineData("  Ana ", "ana@expedientes-spr.local")]
    // md5("josé pérez"): mismo valor que correoDe() de la app (node:crypto)
    [InlineData("José Pérez", "u-98e4137a5b831bf071aef23c9b3949f9@expedientes-spr.local")]
    public void CorreoIgualQueLaApp(string usuario, string esperado) => Assert.Equal(esperado, Usuarios.CorreoDe(usuario));
}

class TransporteFalso : ITransporte
{
    public readonly List<(string metodo, string url, string cuerpo)> Llamadas = new List<(string, string, string)>();
    public Func<string, string, string, Respuesta> Responder;
    public Respuesta Enviar(string metodo, string url, IDictionary<string, string> cab, string cuerpo)
    {
        Assert.Equal("anon", cab["apikey"]);
        Llamadas.Add((metodo, url, cuerpo));
        return Responder(metodo, url, cuerpo);
    }
}

public class PruebasSupabase
{
    static string Jwt(string sub) =>
        "x." + Convert.ToBase64String(Encoding.UTF8.GetBytes("{\"sub\":\"" + sub + "\"}")).TrimEnd('=').Replace('+', '-').Replace('/', '_') + ".y";

    static Respuesta R(int e, string c) => new Respuesta { Estado = e, Cuerpo = c };

    [Fact]
    public void IniciaSesionYCargaExpediente()
    {
        var sesion = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + ".json");
        var t = new TransporteFalso
        {
            Responder = (m, url, cuerpo) =>
            {
                if (url.Contains("grant_type=password"))
                {
                    Assert.Contains("\"email\":\"jesus@expedientes-spr.local\"", cuerpo);
                    return R(200, "{\"access_token\":\"" + Jwt("u1") + "\",\"refresh_token\":\"r1\",\"expires_in\":3600}");
                }
                if (url.Contains("/profiles?id=eq.u1")) return R(200, "[{\"nombre\":\"Jesús Sánchez\",\"activo\":true}]");
                if (url.Contains("/expedientes?id=eq.7"))
                    return R(200, "[{\"id\":7,\"codigo\":\"EXP-007-2026\",\"predio\":\"Hijuela 2 Lote b\",\"escala\":1000,\"acceso_norte\":5385060.902," +
                                  "\"duenos\":[{\"id\":2,\"nombre\":\"B\"},{\"id\":1,\"nombre\":\"A\",\"apoderado_nombre\":\"P\"}]," +
                                  "\"profesional\":{\"nombre\":\"Jesús\",\"rut\":\"26.292.852-7\",\"profesion\":\"Técnico\"}}]");
                throw new Exception("inesperado " + url);
            },
        };
        var cfg = new Configuracion { Url = "https://x.supabase.co", ClaveAnon = "anon" };
        var c = new ClienteSupabase(cfg, t, sesion);
        Assert.False(c.TieneSesion);
        c.IniciarSesion("Jesus", "clave");
        Assert.Equal("Jesús Sánchez", c.NombreUsuario);
        var d = c.CargarExpediente(7);
        Assert.Equal("Hijuela 2 Lote b", d.Predio);
        Assert.Equal(1000, d.Escala);
        Assert.Equal(5385060.902, d.AccesoNorte);
        Assert.Equal(new[] { "A", "B" }, d.Duenos.Select(x => x.Nombre));
        Assert.Equal("P", d.Duenos[0].ApoderadoNombre);
        Assert.Equal("Técnico", d.Profesional.Profesion);

        // La sesión queda guardada: otra instancia renueva el token sin pedir la contraseña
        t.Responder = (m, url, cuerpo) =>
        {
            if (url.Contains("grant_type=refresh_token"))
            {
                Assert.Contains("\"refresh_token\":\"r1\"", cuerpo);
                return R(200, "{\"access_token\":\"" + Jwt("u1") + "\",\"refresh_token\":\"r2\",\"expires_in\":3600}");
            }
            if (url.Contains("/expedientes?select=")) return R(200, "[{\"id\":7,\"codigo\":\"EXP-007-2026\",\"predio\":\"P\",\"comuna\":\"Paine\"}]");
            throw new Exception("inesperado " + url);
        };
        var c2 = new ClienteSupabase(cfg, t, sesion);
        Assert.True(c2.TieneSesion);
        Assert.Equal("EXP-007-2026 · P (Paine)", c2.ListarExpedientes().Single().ToString());
        Assert.Contains("r2", File.ReadAllText(sesion));
        File.Delete(sesion);
    }

    [Fact]
    public void ClaveIncorrecta()
    {
        var t = new TransporteFalso { Responder = (m, u, b) => R(400, "{\"error\":\"invalid_grant\",\"error_description\":\"Invalid login credentials\"}") };
        var c = new ClienteSupabase(new Configuracion { Url = "u", ClaveAnon = "anon" }, t, null);
        var e = Assert.Throws<ErrorUsuario>(() => c.IniciarSesion("x", "y"));
        Assert.Equal("Usuario o contraseña incorrectos.", e.Message);
    }

    [Fact]
    public void SesionVencida()
    {
        var sesion = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + ".json");
        File.WriteAllText(sesion, "{\"usuario\":\"a\",\"refresh_token\":\"viejo\"}");
        var t = new TransporteFalso { Responder = (m, u, b) => R(400, "{\"error\":\"invalid_grant\"}") };
        var c = new ClienteSupabase(new Configuracion { Url = "u", ClaveAnon = "anon" }, t, sesion);
        var e = Assert.Throws<ErrorUsuario>(() => c.ListarExpedientes());
        Assert.Contains("SPR_INGRESAR", e.Message);
        Assert.False(File.Exists(sesion));
    }
}

public class PruebasVineta
{
    static DatosPlano Ejemplo() => new DatosPlano
    {
        Predio = "Hijuela 2 Lote b",
        RolSii = "2115-287",
        Region = "Los Lagos",
        Provincia = "Llanquihue",
        Comuna = "Puerto Montt",
        Sector = "Putenio",
        InscripcionFojas = "5400v",
        InscripcionNumero = "7033",
        InscripcionAnio = "2016",
        Conservador = "Puerto Montt",
        PlanoBase = "N° 7030 del año 2021 Inscritos en el Conservador De Bienes Raíces de Puerto Montt",
        Escala = 1000,
        Duenos =
        {
            new Dueno { Nombre = "Belisario Lionel Mancilla Almonacid", Rut = "6.209.657-8" },
            new Dueno { Nombre = "Ruth Marcela Paredes Paredes", Rut = "11.711.824-K", ApoderadoNombre = "Lucio Enrique Paredes Paredes", ApoderadoRut = "10.887.392-2" },
        },
        Profesional = new Profesional { Nombre = "Jesús Manuel Sánchez Paz", Rut = "26.292.852-7", Profesion = "Técnico de nivel superior en topografía" },
    };

    static List<string> Textos(Dibujo d) => d.Elementos.OfType<Texto>().Select(t => t.Contenido).ToList();

    [Fact]
    public void ContieneLosDatosDelExpediente()
    {
        var d = Vineta.Generar(Ejemplo(), new OpcionesVineta());
        var t = Textos(d);
        Assert.Contains("NOMBRE DEL PREDIO: Hijuela 2 Lote b", t);
        Assert.Contains("N° ROL DE AVALÚO: 2115-287", t);
        Assert.Contains("REGIÓN: LOS LAGOS", t);
        Assert.Contains("INSCRIPCIÓN DE DOMINIO: Fs 5400v N° 7033 Año 2016 Inscritos en el Conservador De Bienes Raíces de Puerto Montt", t);
        Assert.Contains("FORMATO: A0 (1189 x 841 mm)", t);
        Assert.Contains("ESCALA NOMINAL: 1:1000", t);
        Assert.Contains("NOMBRE DEL PROPIETARIO: BELISARIO LIONEL MANCILLA ALMONACID", t);
        Assert.Contains("POR PODER: LUCIO ENRIQUE PAREDES PAREDES", t);
        Assert.Contains("NOMBRE DEL PROFESIONAL: JESÚS MANUEL SÁNCHEZ PAZ", t);
        Assert.Contains("PROFESIÓN: TÉCNICO DE NIVEL SUPERIOR EN TOPOGRAFÍA", t);
        Assert.Contains("LÁMINA: A", t);
        // Firma: una por propietario (el que firma por poder firma él) y la del profesional
        Assert.Equal(3, t.Count(x => x == "FIRMA :"));
        Assert.Empty(d.Faltantes);
        Assert.Single(d.Elementos.OfType<Imagen>());
    }

    [Fact]
    public void GeometriaCerradaYDentroDelAncho()
    {
        var op = new OpcionesVineta();
        var d = Vineta.Generar(Ejemplo(), op);
        Assert.True(d.Alto > 150 && d.Alto < 560, "alto " + d.Alto);
        foreach (var l in d.Elementos.OfType<Linea>())
        {
            Assert.InRange(l.X1, 0, op.Ancho);
            Assert.InRange(l.X2, 0, op.Ancho);
            Assert.InRange(-l.Y1, 0, d.Alto + 1e-9);
        }
        foreach (var t in d.Elementos.OfType<Texto>())
        {
            Assert.InRange(t.X, 0, op.Ancho);
            Assert.InRange(-t.Y, 0, d.Alto);
            // Los textos de las filas llevan el ancho de su celda: AutoCAD los corta sin salirse
            if (t.Alineacion == Alineacion.IzquierdaMedio)
                Assert.True(t.Ancho > 0 && t.X + t.Ancho <= op.Ancho, t.Contenido);
        }
        // La fila de la inscripción (texto largo) es más alta que la del nombre del predio
        var ys = d.Elementos.OfType<Linea>().Where(l => l.Y1 == l.Y2).Select(l => l.Y1).Distinct().OrderByDescending(v => v).ToList();
        Assert.True(ys[3] - ys[4] > ys[0] - ys[1]);
    }

    [Fact]
    public void AvisaLoQueFalta()
    {
        var e = Ejemplo();
        e.Region = null;
        e.InscripcionFojas = e.InscripcionNumero = e.InscripcionAnio = null;
        e.Profesional.Profesion = null;
        e.Duenos[0].Rut = "";
        var d = Vineta.Generar(e, new OpcionesVineta { Formato = Formato.Buscar("a1"), SelloAprobacion = false });
        Assert.Contains("región", d.Faltantes);
        Assert.Contains("inscripción de dominio", d.Faltantes);
        Assert.Contains("profesión del profesional (Mi perfil)", d.Faltantes);
        Assert.Contains("RUT de Belisario Lionel Mancilla Almonacid", d.Faltantes);
        var t = Textos(d);
        Assert.Contains("REGIÓN:", t.Select(x => x.Trim()));
        Assert.Contains("FORMATO: A1 (841 x 594 mm)", t);
        Assert.DoesNotContain("SELLO APROBACIÓN", t);
    }

    [Theory]
    [InlineData("corto", 100, 3, 1)]
    [InlineData("INSCRIPCIÓN DE DOMINIO: Fs 5400v N° 7033 Año 2016 Inscritos en el Conservador De Bienes Raíces de Puerto Montt", 111, 3, 3)]
    public void CalculaLineas(string texto, double ancho, double altura, int esperado) =>
        Assert.Equal(esperado, Vineta.Lineas(texto, ancho, altura));
}

public class VistaPrevia
{
    /// <summary>Con VINETA_SVG=ruta.svg escribe la viñeta de ejemplo como SVG (para revisarla a ojo).</summary>
    [Fact]
    public void ExportarSvg()
    {
        var ruta = Environment.GetEnvironmentVariable("VINETA_SVG");
        if (string.IsNullOrEmpty(ruta)) return;
        var datos = (DatosPlano)typeof(PruebasVineta).GetMethod("Ejemplo", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static).Invoke(null, null);
        var lotes = (List<Lote>)typeof(PruebasCuadro).GetMethod("Lotes", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static).Invoke(null, null);
        var d = Vineta.Generar(datos, new OpcionesVineta(), lotes);
        var inv = System.Globalization.CultureInfo.InvariantCulture;
        var sb = new StringBuilder($"<svg xmlns='http://www.w3.org/2000/svg' viewBox='-5 -5 {d.Ancho + 10} {d.Alto + 10}' width='{(d.Ancho + 10) * 4}' style='background:#fff;font-family:Arial'>");
        foreach (var e in d.Elementos)
        {
            if (e is Linea l) sb.AppendFormat(inv, "<line x1='{0}' y1='{1}' x2='{2}' y2='{3}' stroke='#000' stroke-width='0.3'/>", l.X1, -l.Y1, l.X2, -l.Y2);
            if (e is Imagen im) sb.AppendFormat(inv, "<rect x='{0}' y='{1}' width='{2}' height='{3}' fill='#e1c293'/>", im.X, -(im.Y + im.Alto), im.Ancho, im.Alto);
            if (e is Texto t)
            {
                var lineas = new List<string>();
                if (t.Ancho > 0)
                {
                    var porLinea = (int)(t.Ancho / (t.Altura * 0.75)); var act = "";
                    foreach (var p in t.Contenido.Replace("\n", " \n ").Split(' ')) { if (p == "\n") { lineas.Add(act); act = ""; continue; } if (act.Length > 0 && act.Length + 1 + p.Length > porLinea) { lineas.Add(act); act = p; } else act = act.Length == 0 ? p : act + " " + p; }
                    lineas.Add(act);
                }
                else lineas.Add(t.Contenido);
                var y0 = -t.Y - (lineas.Count - 1) * t.Altura * 1.55 / 2;
                for (var i = 0; i < lineas.Count; i++)
                    sb.AppendFormat(inv, "<text x='{0}' y='{1}' font-size='{2}' dominant-baseline='middle' text-anchor='{3}'>{4}</text>", t.X, y0 + i * t.Altura * 1.55, t.Altura * 1.35,
                        t.Alineacion == Alineacion.CentroMedio ? "middle" : "start", System.Security.SecurityElement.Escape(lineas[i]));
            }
        }
        File.WriteAllText(ruta, sb.Append("</svg>").ToString());
    }
}

public class PruebasCuadro
{
    // Lotes del plano de Belisario Mancilla (lámina A)
    static List<Lote> Lotes() => new List<Lote>
    {
        new Lote { Nombre = "Lote b-12", Superficie = 5300, Servidumbre = 298, AnchoServidumbre = 6 },
        new Lote { Nombre = "Lote b", Superficie = 122923, Servidumbre = 3208, AnchoServidumbre = 6 },
        new Lote { Nombre = "Lote b-5-2", Superficie = 5000, Servidumbre = 119, AnchoServidumbre = 3 },
        new Lote { Nombre = "Lote b-13", Superficie = 5277 },
        new Lote { Nombre = "Lote b-5", Superficie = 5000, Servidumbre = 126, AnchoServidumbre = 3 },
        new Lote { Nombre = "Lote b-8", Superficie = 10000, Servidumbre = 185, AnchoServidumbre = 3 },
    };

    [Fact]
    public void OrdenNaturalDeLosLotes() =>
        Assert.Equal(new[] { "Lote b", "Lote b-5", "Lote b-5-2", "Lote b-8", "Lote b-12", "Lote b-13" }, Cuadro.Ordenar(Lotes()).Select(l => l.Nombre));

    [Fact]
    public void FormatoChileno()
    {
        Assert.Equal("12,2923", Cuadro.Hectareas(122923));
        Assert.Equal("0,0298", Cuadro.Hectareas(298));
        Assert.Equal("1.234,5679", Cuadro.Hectareas(12345678.9));
        Assert.Equal("6 m", Cuadro.Metros(6));
        Assert.Equal("2,5 m", Cuadro.Metros(2.5));
    }

    [Fact]
    public void FilasYTotalesComoElPlano()
    {
        var d = Cuadro.Generar(Lotes(), new OpcionesVineta());
        var t = d.Elementos.OfType<Texto>().Select(x => x.Contenido).ToList();
        Assert.Equal("CUADRO DE SUPERFICIE", t[0]);
        Assert.Contains("NOMBRE DEL\nLOTE RESULTANTE", t);
        // Lote b: 12,2923 · 0,3208 · 6 m (igual que la lámina)
        var i = t.IndexOf("Lote b");
        Assert.Equal(new[] { "12,2923", "0,3208", "6 m" }, t.Skip(i + 1).Take(3));
        // Lote sin servidumbre
        i = t.IndexOf("Lote b-13");
        Assert.Equal(new[] { "0,5277", "---", "---" }, t.Skip(i + 1).Take(3));
        // Total: 15,3500 ha y 0,3936 ha de servidumbre (la lámina dice 15,35 y 0,3936)
        i = t.IndexOf("TOTAL\nSUPERFICIE");
        Assert.Equal(new[] { "15,3500", "0,3936", "---" }, t.Skip(i + 1).Take(3));
        Assert.True(d.Alto > 80);
    }

    [Fact]
    public void DentroDeLaVineta()
    {
        var datos = new DatosPlano { Predio = "Hijuela 2 Lote b", Profesional = new Profesional { Nombre = "J" } };
        var con = Vineta.Generar(datos, new OpcionesVineta(), Lotes());
        var sin = Vineta.Generar(datos, new OpcionesVineta());
        var t = con.Elementos.OfType<Texto>().Select(x => x.Contenido).ToList();
        Assert.True(t.IndexOf("CUADRO DE SUPERFICIE") > t.IndexOf("LÁMINA: A"));
        Assert.True(t.IndexOf("CUADRO DE SUPERFICIE") < t.IndexOf("EMPRESA RESPONSABLE"));
        Assert.True(con.Alto > sin.Alto + 80);
    }
}
