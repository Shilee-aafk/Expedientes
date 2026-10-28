export type PreferenciaTema = "oscuro" | "claro" | "auto";

export const CLAVE_TEMA = "tema";

/** Tema efectivo según la preferencia guardada (oscuro por defecto). */
export function resolverTema(pref: PreferenciaTema): "dark" | "light" {
  if (pref === "auto") return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return pref === "claro" ? "light" : "dark";
}

/** Se ejecuta en <head> antes de pintar para que no haya parpadeo de tema. */
export const SCRIPT_TEMA = `(function(){try{var p=localStorage.getItem("${CLAVE_TEMA}")||"oscuro";var t=p==="auto"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):(p==="claro"?"light":"dark");document.documentElement.dataset.theme=t}catch(e){}})()`;
