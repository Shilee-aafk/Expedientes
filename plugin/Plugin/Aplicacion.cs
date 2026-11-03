using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.Runtime;
using ExpedientesSPR.Nucleo;
using AcApp = Autodesk.AutoCAD.ApplicationServices.Core.Application;

[assembly: ExtensionApplication(typeof(ExpedientesSPR.Aplicacion))]
[assembly: CommandClass(typeof(ExpedientesSPR.Comandos))]

namespace ExpedientesSPR
{
    /// <summary>Se carga al abrir AutoCAD / Civil 3D (lo indica PackageContents.xml).</summary>
    public sealed class Aplicacion : IExtensionApplication
    {
        static ClienteSupabase cliente;

        /// <summary>Carpeta de esta DLL (Contents\R24 o Contents\R25 dentro del .bundle).</summary>
        public static string CarpetaPlugin => Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);

        /// <summary>Carpeta Contents del bundle (config.json y Recursos).</summary>
        public static string CarpetaContenido => Path.GetDirectoryName(CarpetaPlugin);

        public static string Version => Assembly.GetExecutingAssembly().GetName().Version.ToString(3);

        public static ClienteSupabase Cliente
        {
            get
            {
                if (cliente == null)
                {
                    var cfg = Configuracion.Cargar(CarpetaPlugin);
                    cliente = new ClienteSupabase(cfg, new TransporteHttp(), Path.Combine(Rutas.CarpetaDatos, "sesion.json"));
                }
                return cliente;
            }
        }

        public void Initialize()
        {
#if NETFRAMEWORK
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
#endif
            try
            {
                AcApp.DocumentManager.MdiActiveDocument?.Editor.WriteMessage(
                    $"\nExpedientes SPR {Version} cargado. Comandos: SPR_INGRESAR, SPR_EXPEDIENTE, SPR_VINETA, SPR_SALIR.\n");
            }
            catch (System.Exception) { /* sin documento abierto */ }
        }

        public void Terminate() { }

        public static void Registrar(string texto)
        {
            try
            {
                Directory.CreateDirectory(Rutas.CarpetaDatos);
                File.AppendAllText(Path.Combine(Rutas.CarpetaDatos, "plugin.log"), $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} {texto}{Environment.NewLine}");
            }
            catch (IOException) { }
        }
    }

    /// <summary>HTTP con HttpClient. Las llamadas son cortas y se esperan en un hilo aparte para no trabar AutoCAD.</summary>
    sealed class TransporteHttp : ITransporte
    {
        static readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };

        public Respuesta Enviar(string metodo, string url, IDictionary<string, string> cabeceras, string cuerpoJson)
        {
            try
            {
                return System.Threading.Tasks.Task.Run(async () =>
                {
                    using (var req = new HttpRequestMessage(new HttpMethod(metodo), url))
                    {
                        foreach (var kv in cabeceras) req.Headers.TryAddWithoutValidation(kv.Key, kv.Value);
                        if (cuerpoJson != null) req.Content = new StringContent(cuerpoJson, Encoding.UTF8, "application/json");
                        using (var r = await http.SendAsync(req).ConfigureAwait(false))
                            return new Respuesta { Estado = (int)r.StatusCode, Cuerpo = await r.Content.ReadAsStringAsync().ConfigureAwait(false) };
                    }
                }).GetAwaiter().GetResult();
            }
            catch (HttpRequestException e)
            {
                throw new ErrorUsuario("Sin conexión con Supabase. Revisa internet. (" + e.Message + ")");
            }
            catch (System.Threading.Tasks.TaskCanceledException)
            {
                throw new ErrorUsuario("Supabase no respondió a tiempo. Revisa internet e intenta de nuevo.");
            }
        }
    }
}
