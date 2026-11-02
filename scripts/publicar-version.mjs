// Prepara una versión nueva de la app de escritorio:
//   npm run publicar -- 0.2.0
// Cambia la versión en package.json y electron/package.json, hace commit y crea la
// etiqueta v0.2.0. Al subirla (git push --follow-tags), GitHub Actions compila el
// instalador y lo publica; las apps instaladas lo detectan y se actualizan.
import { execSync } from "node:child_process";
import fs from "node:fs";

const version = process.argv[2]?.replace(/^v/, "");
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Uso: npm run publicar -- 0.2.0   (versión con formato X.Y.Z, mayor que la actual)");
  process.exit(1);
}

const sh = (cmd) => execSync(cmd, { stdio: "pipe" }).toString().trim();
if (sh("git status --porcelain")) {
  console.error("Hay cambios sin commit. Haz commit de tu trabajo antes de publicar una versión.");
  process.exit(1);
}

const mayor = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
const actual = JSON.parse(fs.readFileSync("electron/package.json", "utf8")).version;
if (!mayor(version, actual)) {
  console.error(`La versión nueva (${version}) debe ser mayor que la actual (${actual}).`);
  process.exit(1);
}

const archivos = ["package.json", "package-lock.json", "electron/package.json", "electron/package-lock.json"];
for (const archivo of archivos) {
  const json = JSON.parse(fs.readFileSync(archivo, "utf8"));
  json.version = version;
  if (json.packages?.[""]) json.packages[""].version = version;
  fs.writeFileSync(archivo, JSON.stringify(json, null, 2) + "\n");
}
sh(`git add ${archivos.join(" ")}`);
sh(`git commit -m "Versión ${version}"`);
sh(`git tag v${version}`);
console.log(`Versión ${version} lista (commit y etiqueta v${version}).`);
console.log("Para publicarla:  git push --follow-tags");
