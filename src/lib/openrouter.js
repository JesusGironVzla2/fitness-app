/**
 * Cabeceras y clave para las llamadas a OpenRouter.
 *
 * Las tres pantallas que hablan con la IA (chat del coach, análisis del
 * Dashboard y generación de rutinas) repetían el mismo bloque de cabeceras con
 * el dominio escrito a mano: `https://coachnode.vercel.app`. Ese dominio dejó de
 * estar asignado a ningún despliegue, así que la cabecera `HTTP-Referer` viajaba
 * apuntando a una URL muerta.
 *
 * OpenRouter usa `HTTP-Referer` para atribuir el tráfico, y es opcional. En vez
 * de fijar un dominio que puede volver a caducar, se deduce del origen real
 * donde corre la app; si no hay `window` (los smoke tests renderizan en SSR) se
 * omite la cabecera en lugar de mentir sobre el origen.
 */

const APP_TITLE = 'CoachNode';

/** Clave de OpenRouter, con el nombre antiguo (`GEMINI`) como alternativa. */
export function getOpenRouterKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
}

/**
 * Origen a declarar ante OpenRouter: `VITE_SITE_URL` si el despliegue lo fija,
 * y si no el origen del navegador. `null` cuando no hay ninguno de los dos.
 */
function siteOrigin() {
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location) return window.location.origin;
  return null;
}

/** Cabeceras completas para `POST /api/v1/chat/completions`. */
export function openRouterHeaders(apiKey) {
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "X-Title": APP_TITLE,
    "Content-Type": "application/json"
  };
  const origin = siteOrigin();
  if (origin) headers["HTTP-Referer"] = origin;
  return headers;
}
