// Inicia el servidor compilado (.next/standalone) con los datos en <proyecto>/datos.
// Uso: node scripts/iniciar.mjs [--red] [--puerto 3000]
import { spawn } from "node:child_process";
import path from "node:path";
import "./preparar-app.mjs";

const args = process.argv.slice(2);
const i = args.indexOf("--puerto");
const puerto = i >= 0 ? args[i + 1] : (process.env.PORT ?? "3000");
const host = args.includes("--red") ? "0.0.0.0" : "127.0.0.1";
const raiz = process.cwd();

const servidor = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", path.join(raiz, ".next", "standalone", "server.js")], {
  stdio: "inherit",
  // El servidor standalone cambia su carpeta de trabajo: la de datos se fija aquí, fuera de .next
  env: { ...process.env, NODE_ENV: "production", PORT: puerto, HOSTNAME: host, DATOS_DIR: process.env.DATOS_DIR ?? path.join(raiz, "datos") },
});
servidor.on("exit", (codigo) => process.exit(codigo ?? 0));
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => servidor.kill(s));
