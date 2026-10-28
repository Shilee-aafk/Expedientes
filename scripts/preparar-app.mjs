// Completa el servidor standalone con los archivos estáticos que Next no copia solo.
import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const standalone = path.join(raiz, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("Falta .next/standalone: ejecuta primero `npm run build`.");
  process.exit(1);
}
fs.cpSync(path.join(raiz, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
fs.cpSync(path.join(raiz, "public"), path.join(standalone, "public"), { recursive: true });
fs.rmSync(path.join(standalone, "datos"), { recursive: true, force: true });
console.log("Servidor listo para empaquetar:", path.relative(raiz, standalone));
