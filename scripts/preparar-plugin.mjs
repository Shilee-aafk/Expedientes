// Compila el plugin de AutoCAD / Civil 3D y arma plugin/dist/ExpedientesSPR.bundle
// (formato "Autodesk ApplicationPlugins": AutoCAD lo carga solo al abrir).
//   Contents/R24 → AutoCAD y Civil 3D 2021–2024 (.NET Framework 4.8)
//   Contents/R25 → AutoCAD y Civil 3D 2025–2026 (.NET 8)
// La app lo copia a %APPDATA%\Autodesk\ApplicationPlugins y escribe Contents/config.json.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const proyecto = path.join(raiz, "plugin", "Plugin", "ExpedientesSPR.csproj");
const csproj = fs.readFileSync(proyecto, "utf8");
const version = csproj.match(/<Version>([^<]+)<\/Version>/)[1];

if (!process.argv.includes("--sin-compilar")) {
  execFileSync("dotnet", ["build", proyecto, "-c", "Release", "--nologo", "-v", "q"], { stdio: "inherit" });
}

const salida = path.join(raiz, "plugin", "dist", "ExpedientesSPR.bundle");
fs.rmSync(salida, { recursive: true, force: true });
const bin = path.join(raiz, "plugin", "Plugin", "bin", "Release");
for (const [serie, tfm] of [["R24", "net48"], ["R25", "net8.0-windows"]]) {
  const destino = path.join(salida, "Contents", serie);
  fs.mkdirSync(destino, { recursive: true });
  for (const f of ["ExpedientesSPR.dll", "ExpedientesSPR.deps.json"]) {
    const origen = path.join(bin, tfm, f);
    if (fs.existsSync(origen)) fs.copyFileSync(origen, path.join(destino, f));
  }
  if (!fs.existsSync(path.join(destino, "ExpedientesSPR.dll"))) throw new Error(`Falta la compilación ${tfm}`);
}
fs.mkdirSync(path.join(salida, "Contents", "Recursos"), { recursive: true });
fs.copyFileSync(path.join(raiz, "plugin", "recursos", "logo-sp.png"), path.join(salida, "Contents", "Recursos", "logo-sp.png"));

const componente = (serie, min, max, descripcion) => `
  <Components Description="${descripcion}">
    <RuntimeRequirements OS="Win64" Platform="AutoCAD*" SeriesMin="${min}" SeriesMax="${max}" />
    <ComponentEntry AppName="ExpedientesSPR" Version="${version}" ModuleName="./Contents/${serie}/ExpedientesSPR.dll"
                    AppDescription="Viñeta y planos de subdivisión con los datos de Expedientes SPR" LoadOnAutoCADStartup="True">
      <Commands GroupName="EXPEDIENTES_SPR">
        <Command Global="SPR_INGRESAR" Local="SPR_INGRESAR" />
        <Command Global="SPR_EXPEDIENTE" Local="SPR_EXPEDIENTE" />
        <Command Global="SPR_VINETA" Local="SPR_VINETA" />
        <Command Global="SPR_SALIR" Local="SPR_SALIR" />
      </Commands>
    </ComponentEntry>
  </Components>`;

fs.writeFileSync(
  path.join(salida, "PackageContents.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<ApplicationPackage SchemaVersion="1.0" AutodeskProduct="AutoCAD" ProductType="Application"
                    Name="Expedientes SPR" AppVersion="${version}" Author="Sánchez Paz Proyectos y Servicios"
                    Description="Planos de subdivisión de predios rústicos conectados a la app Expedientes SPR"
                    ProductCode="{6B0E5D52-4C1E-4E43-9A3B-6F1C2B8E1A01}" UpgradeCode="{0C8C7E1F-2B44-4F6D-8C11-3D5A9E7B2F02}">
  <CompanyDetails Name="Sánchez Paz Proyectos y Servicios" Url="https://spproyectos.cl" />
  <RuntimeRequirements OS="Win64" Platform="AutoCAD*" SeriesMin="R24.0" SeriesMax="R25.9" />${componente("R24", "R24.0", "R24.3", "AutoCAD y Civil 3D 2021-2024")}${componente("R25", "R25.0", "R25.9", "AutoCAD y Civil 3D 2025-2026")}
</ApplicationPackage>
`,
);
fs.writeFileSync(path.join(salida, "Contents", "version.txt"), version + "\n");
console.log(`Plugin ${version} listo en ${path.relative(raiz, salida)}`);
