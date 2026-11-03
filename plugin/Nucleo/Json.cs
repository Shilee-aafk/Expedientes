using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace ExpedientesSPR.Nucleo
{
    /// <summary>
    /// JSON mínimo (leer y escribir) para no cargar librerías dentro de AutoCAD:
    /// cada versión de AutoCAD trae las suyas y una DLL repetida puede chocar.
    /// Objetos = Dictionary&lt;string, object&gt;, arreglos = List&lt;object&gt;, números = double.
    /// </summary>
    public static class Json
    {
        public static object Leer(string texto)
        {
            var l = new Lector(texto);
            l.Espacios();
            var v = l.Valor();
            l.Espacios();
            if (!l.Fin) throw l.Error("texto sobrante");
            return v;
        }

        public static string Escribir(object valor)
        {
            var sb = new StringBuilder();
            Escribir(sb, valor);
            return sb.ToString();
        }

        static void Escribir(StringBuilder sb, object v)
        {
            switch (v)
            {
                case null: sb.Append("null"); break;
                case bool b: sb.Append(b ? "true" : "false"); break;
                case string s: Cadena(sb, s); break;
                case double d: sb.Append(d.ToString("R", CultureInfo.InvariantCulture)); break;
                case int i: sb.Append(i.ToString(CultureInfo.InvariantCulture)); break;
                case long n: sb.Append(n.ToString(CultureInfo.InvariantCulture)); break;
                case IDictionary<string, object> o:
                    sb.Append('{');
                    var primero = true;
                    foreach (var kv in o)
                    {
                        if (!primero) sb.Append(',');
                        primero = false;
                        Cadena(sb, kv.Key);
                        sb.Append(':');
                        Escribir(sb, kv.Value);
                    }
                    sb.Append('}');
                    break;
                case System.Collections.IEnumerable lista:
                    sb.Append('[');
                    var p = true;
                    foreach (var x in lista)
                    {
                        if (!p) sb.Append(',');
                        p = false;
                        Escribir(sb, x);
                    }
                    sb.Append(']');
                    break;
                default: throw new ArgumentException("Tipo no soportado en JSON: " + v.GetType());
            }
        }

        static void Cadena(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (var c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
                        else sb.Append(c);
                        break;
                }
            }
            sb.Append('"');
        }

        sealed class Lector
        {
            readonly string t;
            int i;
            public Lector(string texto) { t = texto ?? ""; }
            public bool Fin => i >= t.Length;
            public FormatException Error(string m) => new FormatException($"JSON inválido ({m}) en la posición {i}.");

            public void Espacios() { while (i < t.Length && char.IsWhiteSpace(t[i])) i++; }

            public object Valor()
            {
                if (Fin) throw Error("fin inesperado");
                var c = t[i];
                if (c == '{') return Objeto();
                if (c == '[') return Arreglo();
                if (c == '"') return Texto();
                if (Palabra("true")) return true;
                if (Palabra("false")) return false;
                if (Palabra("null")) return null;
                return Numero();
            }

            bool Palabra(string p)
            {
                if (string.CompareOrdinal(t, i, p, 0, p.Length) != 0) return false;
                i += p.Length;
                return true;
            }

            Dictionary<string, object> Objeto()
            {
                var o = new Dictionary<string, object>();
                i++;
                Espacios();
                if (i < t.Length && t[i] == '}') { i++; return o; }
                while (true)
                {
                    Espacios();
                    if (Fin || t[i] != '"') throw Error("se esperaba una clave");
                    var k = Texto();
                    Espacios();
                    if (Fin || t[i] != ':') throw Error("se esperaba ':'");
                    i++;
                    Espacios();
                    o[k] = Valor();
                    Espacios();
                    if (Fin) throw Error("objeto sin cerrar");
                    if (t[i] == ',') { i++; continue; }
                    if (t[i] == '}') { i++; return o; }
                    throw Error("se esperaba ',' o '}'");
                }
            }

            List<object> Arreglo()
            {
                var a = new List<object>();
                i++;
                Espacios();
                if (i < t.Length && t[i] == ']') { i++; return a; }
                while (true)
                {
                    Espacios();
                    a.Add(Valor());
                    Espacios();
                    if (Fin) throw Error("arreglo sin cerrar");
                    if (t[i] == ',') { i++; continue; }
                    if (t[i] == ']') { i++; return a; }
                    throw Error("se esperaba ',' o ']'");
                }
            }

            string Texto()
            {
                var sb = new StringBuilder();
                i++;
                while (true)
                {
                    if (Fin) throw Error("texto sin cerrar");
                    var c = t[i++];
                    if (c == '"') return sb.ToString();
                    if (c != '\\') { sb.Append(c); continue; }
                    if (Fin) throw Error("escape incompleto");
                    var e = t[i++];
                    switch (e)
                    {
                        case '"': sb.Append('"'); break;
                        case '\\': sb.Append('\\'); break;
                        case '/': sb.Append('/'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case 'n': sb.Append('\n'); break;
                        case 'r': sb.Append('\r'); break;
                        case 't': sb.Append('\t'); break;
                        case 'u':
                            if (i + 4 > t.Length) throw Error("escape \\u incompleto");
                            sb.Append((char)int.Parse(t.Substring(i, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                            i += 4;
                            break;
                        default: throw Error("escape desconocido");
                    }
                }
            }

            double Numero()
            {
                var ini = i;
                while (i < t.Length && "+-0123456789.eE".IndexOf(t[i]) >= 0) i++;
                if (ini == i) throw Error("valor inesperado");
                return double.Parse(t.Substring(ini, i - ini), NumberStyles.Float, CultureInfo.InvariantCulture);
            }
        }
    }

    /// <summary>Lectura cómoda de un objeto JSON.</summary>
    public static class JsonExt
    {
        public static string Texto(this IDictionary<string, object> o, string k)
        {
            if (o == null || !o.TryGetValue(k, out var v) || v == null) return null;
            if (v is double d) return d.ToString("R", CultureInfo.InvariantCulture);
            var s = Convert.ToString(v, CultureInfo.InvariantCulture)?.Trim();
            return string.IsNullOrEmpty(s) ? null : s;
        }

        public static double? Numero(this IDictionary<string, object> o, string k)
        {
            if (o == null || !o.TryGetValue(k, out var v) || v == null) return null;
            if (v is double d) return d;
            return double.TryParse(Convert.ToString(v, CultureInfo.InvariantCulture), NumberStyles.Float, CultureInfo.InvariantCulture, out var n) ? n : (double?)null;
        }

        public static IDictionary<string, object> Objeto(this IDictionary<string, object> o, string k) =>
            o != null && o.TryGetValue(k, out var v) ? v as IDictionary<string, object> : null;

        public static IEnumerable<IDictionary<string, object>> Lista(this IDictionary<string, object> o, string k)
        {
            if (o == null || !o.TryGetValue(k, out var v) || !(v is List<object> l)) yield break;
            foreach (var x in l) if (x is IDictionary<string, object> d) yield return d;
        }
    }
}
