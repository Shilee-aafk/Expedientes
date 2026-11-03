using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace ExpedientesSPR.Nucleo
{
    /// <summary>Respuesta HTTP simplificada.</summary>
    public sealed class Respuesta
    {
        public int Estado;
        public string Cuerpo;
        public bool Ok => Estado >= 200 && Estado < 300;
    }

    /// <summary>Envío HTTP (se reemplaza en las pruebas).</summary>
    public interface ITransporte
    {
        Respuesta Enviar(string metodo, string url, IDictionary<string, string> cabeceras, string cuerpoJson);
    }

    /// <summary>Dirección y clave pública (anon) del proyecto de Supabase.</summary>
    public sealed class Configuracion
    {
        public string Url;
        public string ClaveAnon;

        /// <summary>
        /// Busca config.json junto al plugin o una carpeta más arriba (lo escribe la app al instalarlo),
        /// o en %APPDATA%\Expedientes SPR\plugin. Las variables SUPABASE_URL / SUPABASE_ANON_KEY mandan.
        /// </summary>
        public static Configuracion Cargar(string carpetaPlugin)
        {
            var c = new Configuracion();
            var carpeta = carpetaPlugin ?? "";
            var candidatos = new[]
            {
                Path.Combine(carpeta, "config.json"),
                Path.Combine(carpeta.Length == 0 ? "" : Path.GetDirectoryName(carpeta.TrimEnd('\\', '/')) ?? carpeta, "config.json"),
                Path.Combine(Rutas.CarpetaDatos, "config.json"),
            };
            foreach (var ruta in candidatos)
            {
                if (!File.Exists(ruta)) continue;
                if (Json.Leer(File.ReadAllText(ruta)) is IDictionary<string, object> o)
                {
                    c.Url = o.Texto("url");
                    c.ClaveAnon = o.Texto("anonKey");
                }
                break;
            }
            c.Url = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? c.Url;
            c.ClaveAnon = Environment.GetEnvironmentVariable("SUPABASE_ANON_KEY") ?? c.ClaveAnon;
            if (string.IsNullOrEmpty(c.Url) || string.IsNullOrEmpty(c.ClaveAnon))
                throw new ErrorUsuario("Falta la configuración de Supabase. Instala el plugin desde la app Expedientes SPR (Mi perfil → Plugin para AutoCAD).");
            c.Url = c.Url.TrimEnd('/');
            return c;
        }
    }

    public static class Rutas
    {
        public static string CarpetaDatos =>
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Expedientes SPR", "plugin");
    }

    /// <summary>Error para mostrar tal cual a la persona.</summary>
    public sealed class ErrorUsuario : Exception
    {
        public ErrorUsuario(string mensaje) : base(mensaje) { }
    }

    public static class Usuarios
    {
        /// <summary>Correo interno de Supabase Auth. Igual que correoDe() de la app y public.correo_de().</summary>
        public static string CorreoDe(string usuario)
        {
            var u = (usuario ?? "").Trim().ToLowerInvariant();
            var valido = u.Length >= 1 && u.Length <= 60;
            foreach (var c in u)
                if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '.' || c == '_' || c == '-')) valido = false;
            string local;
            if (valido) local = u;
            else
            {
                using (var md5 = MD5.Create())
                {
                    var h = md5.ComputeHash(Encoding.UTF8.GetBytes(u));
                    var sb = new StringBuilder("u-");
                    foreach (var b in h) sb.Append(b.ToString("x2"));
                    local = sb.ToString();
                }
            }
            return local + "@expedientes-spr.local";
        }
    }

    /// <summary>
    /// Conexión con la base de la app: inicia sesión con el mismo usuario y contraseña,
    /// recuerda la sesión (token de renovación) y lee los expedientes. Solo lectura por ahora.
    /// </summary>
    public sealed class ClienteSupabase
    {
        readonly Configuracion cfg;
        readonly ITransporte http;
        readonly string archivoSesion;
        string tokenAcceso;
        DateTime venceAcceso;
        string tokenRenovacion;
        public string Usuario { get; private set; }
        public string NombreUsuario { get; private set; }

        public ClienteSupabase(Configuracion cfg, ITransporte http, string archivoSesion)
        {
            this.cfg = cfg;
            this.http = http;
            this.archivoSesion = archivoSesion;
            CargarSesion();
        }

        public bool TieneSesion => !string.IsNullOrEmpty(tokenRenovacion);

        public void IniciarSesion(string usuario, string clave)
        {
            var r = Auth("password", new Dictionary<string, object> { ["email"] = Usuarios.CorreoDe(usuario), ["password"] = clave ?? "" });
            if (!r.Ok)
            {
                var msg = MensajeError(r);
                if (r.Estado == 400 && msg.IndexOf("banned", StringComparison.OrdinalIgnoreCase) >= 0)
                    throw new ErrorUsuario("Tu usuario está desactivado.");
                if (r.Estado == 400) throw new ErrorUsuario("Usuario o contraseña incorrectos.");
                throw new ErrorUsuario("No se pudo iniciar sesión: " + msg);
            }
            Usuario = usuario.Trim();
            GuardarTokens(r);
            var perfil = PerfilPropio();
            if (perfil == null || perfil.ContainsKey("activo") && perfil["activo"] is bool a && !a)
            {
                CerrarSesion();
                throw new ErrorUsuario("Tu usuario está desactivado.");
            }
            NombreUsuario = perfil.Texto("nombre");
            Guardar();
        }

        public void CerrarSesion()
        {
            tokenAcceso = tokenRenovacion = null;
            Usuario = NombreUsuario = null;
            try { if (File.Exists(archivoSesion)) File.Delete(archivoSesion); } catch (IOException) { }
        }

        public List<ExpedienteResumen> ListarExpedientes()
        {
            var lista = new List<ExpedienteResumen>();
            var datos = Get("/rest/v1/expedientes?select=id,codigo,predio,comuna&order=updated_at.desc") as List<object>;
            if (datos == null) return lista;
            foreach (var x in datos)
                if (x is IDictionary<string, object> o)
                    lista.Add(new ExpedienteResumen { Id = (long)(o.Numero("id") ?? 0), Codigo = o.Texto("codigo"), Predio = o.Texto("predio"), Comuna = o.Texto("comuna") });
            return lista;
        }

        public DatosPlano CargarExpediente(long id)
        {
            var datos = Get("/rest/v1/expedientes?id=eq." + id.ToString(CultureInfo.InvariantCulture) +
                            "&select=*,duenos(*),profesional:profiles!expedientes_profesional_id_fkey(nombre,rut,profesion)") as List<object>;
            if (datos == null || datos.Count == 0 || !(datos[0] is IDictionary<string, object> o))
                throw new ErrorUsuario("El expediente ya no existe o no tienes acceso.");
            return DatosPlano.DesdeJson(o);
        }

        // ── Internos ──────────────────────────────────────────────────────

        IDictionary<string, object> PerfilPropio()
        {
            var id = IdDelToken(tokenAcceso);
            var l = Get("/rest/v1/profiles?id=eq." + id + "&select=nombre,activo") as List<object>;
            return l != null && l.Count > 0 ? l[0] as IDictionary<string, object> : null;
        }

        object Get(string ruta)
        {
            AsegurarAcceso();
            var r = http.Enviar("GET", cfg.Url + ruta, Cabeceras(tokenAcceso), null);
            if (r.Estado == 401)
            {
                // Token vencido antes de lo esperado: se renueva una vez
                Renovar();
                r = http.Enviar("GET", cfg.Url + ruta, Cabeceras(tokenAcceso), null);
            }
            if (!r.Ok) throw new ErrorUsuario("Error al leer de Supabase: " + MensajeError(r));
            return Json.Leer(r.Cuerpo);
        }

        void AsegurarAcceso()
        {
            if (!TieneSesion) throw new ErrorUsuario("Primero inicia sesión con SPR_INGRESAR.");
            if (tokenAcceso == null || DateTime.UtcNow >= venceAcceso) Renovar();
        }

        void Renovar()
        {
            var r = Auth("refresh_token", new Dictionary<string, object> { ["refresh_token"] = tokenRenovacion });
            if (!r.Ok)
            {
                CerrarSesion();
                throw new ErrorUsuario("La sesión venció. Vuelve a entrar con SPR_INGRESAR.");
            }
            GuardarTokens(r);
            Guardar();
        }

        Respuesta Auth(string tipo, Dictionary<string, object> cuerpo) =>
            http.Enviar("POST", cfg.Url + "/auth/v1/token?grant_type=" + tipo, Cabeceras(null), Json.Escribir(cuerpo));

        void GuardarTokens(Respuesta r)
        {
            var o = (IDictionary<string, object>)Json.Leer(r.Cuerpo);
            tokenAcceso = o.Texto("access_token");
            tokenRenovacion = o.Texto("refresh_token");
            var seg = o.Numero("expires_in") ?? 3600;
            venceAcceso = DateTime.UtcNow.AddSeconds(Math.Max(60, seg - 60));
        }

        Dictionary<string, string> Cabeceras(string token) => new Dictionary<string, string>
        {
            ["apikey"] = cfg.ClaveAnon,
            ["Authorization"] = "Bearer " + (token ?? cfg.ClaveAnon),
        };

        static string MensajeError(Respuesta r)
        {
            try
            {
                if (Json.Leer(r.Cuerpo) is IDictionary<string, object> o)
                    return o.Texto("error_description") ?? o.Texto("msg") ?? o.Texto("message") ?? o.Texto("error") ?? ("HTTP " + r.Estado);
            }
            catch (FormatException) { }
            return "HTTP " + r.Estado;
        }

        /// <summary>El id del usuario va en el campo "sub" del token (JWT).</summary>
        public static string IdDelToken(string jwt)
        {
            var partes = (jwt ?? "").Split('.');
            if (partes.Length < 2) throw new ErrorUsuario("Respuesta de inicio de sesión inválida.");
            var b = partes[1].Replace('-', '+').Replace('_', '/');
            b = b.PadRight(b.Length + (4 - b.Length % 4) % 4, '=');
            var o = (IDictionary<string, object>)Json.Leer(Encoding.UTF8.GetString(Convert.FromBase64String(b)));
            return o.Texto("sub");
        }

        void CargarSesion()
        {
            try
            {
                if (archivoSesion == null || !File.Exists(archivoSesion)) return;
                var o = Json.Leer(File.ReadAllText(archivoSesion)) as IDictionary<string, object>;
                tokenRenovacion = o.Texto("refresh_token");
                Usuario = o.Texto("usuario");
                NombreUsuario = o.Texto("nombre");
            }
            catch (Exception e) when (e is IOException || e is FormatException || e is UnauthorizedAccessException) { }
        }

        void Guardar()
        {
            if (archivoSesion == null) return;
            Directory.CreateDirectory(Path.GetDirectoryName(archivoSesion));
            File.WriteAllText(archivoSesion, Json.Escribir(new Dictionary<string, object>
            {
                ["usuario"] = Usuario,
                ["nombre"] = NombreUsuario,
                ["refresh_token"] = tokenRenovacion,
            }));
        }
    }
}
