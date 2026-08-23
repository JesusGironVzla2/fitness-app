/**
 * Auditoría responsive con Chrome real.
 *
 * jsdom no calcula layout, así que no sirve para detectar desbordes. Aquí se
 * usa el Chrome instalado en el equipo (vía puppeteer-core, sin descargar nada)
 * para medir de verdad cada página en varios anchos de pantalla.
 *
 * Comprueba, por página y por tamaño:
 *   - Desborde horizontal (la página no debe poder desplazarse en horizontal).
 *   - Elementos concretos más anchos que la ventana.
 *   - Texto por debajo de 12px (ilegible en móvil).
 *   - Botones y enlaces con área táctil menor de 40px.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out');
const PUERTO = 5321;

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => p && fs.existsSync(p));

const VIEWPORTS = [
  { nombre: 'iPhone SE', ancho: 320, alto: 568, movil: true },
  { nombre: 'Android peq.', ancho: 360, alto: 740, movil: true },
  { nombre: 'iPhone 14', ancho: 390, alto: 844, movil: true },
  { nombre: 'iPhone Plus', ancho: 430, alto: 932, movil: true },
  { nombre: 'Tablet', ancho: 768, alto: 1024, movil: false },
  { nombre: 'Portátil', ancho: 1280, alto: 800, movil: false },
];

const PAGINAS = [
  ['login', 'admin', '0'],
  ['dashboard', 'student', '1'],
  ['dashboard', 'admin', '1'],
  ['alumnos', 'trainer', '1'],
  ['ejercicios', 'admin', '1'],
  ['rutinas', 'trainer', '1'],
  ['mis-rutinas', 'student', '1'],
  ['progreso', 'student', '1'],
  ['control-corporal', 'student', '1'],
  ['fuerza-hipertrofia', 'student', '1'],
  ['mensajes', 'trainer', '1'],
  ['soporte', 'admin', '1'],
  ['configuracion', 'student', '1'],
  ['consejos', 'student', '1'],
  ['wellness', 'student', '1'],
  ['entrenadores', 'admin', '1'],
];

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function servir() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      const limpio = decodeURIComponent(req.url.split('?')[0]);
      let f = path.join(OUT, limpio === '/' ? 'index.html' : limpio);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(OUT, 'index.html');
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(PUERTO, '127.0.0.1', () => resolve(s));
  });
}

// Se ejecuta dentro de la página.
function auditar() {
  const anchoVentana = window.innerWidth;
  const problemas = [];

  const scrollW = Math.max(
    document.documentElement.scrollWidth,
    document.body ? document.body.scrollWidth : 0
  );
  const desborde = scrollW - anchoVentana;

  const descripcion = (el) => {
    const clase = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    const texto = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28);
    return `${el.tagName.toLowerCase()}${clase}${texto ? ` "${texto}"` : ''}`;
  };

  const todos = [...document.querySelectorAll('body *')];

  // Elementos que sobresalen por la derecha
  const anchos = [];
  for (const el of todos) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const est = getComputedStyle(el);
    if (est.position === 'fixed') continue; // los fijos se miden aparte
    if (r.right > anchoVentana + 1) {
      anchos.push({ el: descripcion(el), sobra: Math.round(r.right - anchoVentana) });
    }
  }
  // Sólo los contenedores más externos, para no repetir toda la cadena de padres
  anchos.sort((a, b) => b.sobra - a.sobra);

  // Texto demasiado pequeño
  const pequeno = new Set();
  for (const el of todos) {
    if (!el.childNodes.length) continue;
    const tieneTexto = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 2
    );
    if (!tieneTexto) continue;
    const fs2 = parseFloat(getComputedStyle(el).fontSize);
    if (fs2 && fs2 < 12) pequeno.add(`${descripcion(el)} (${fs2.toFixed(1)}px)`);
  }

  // Área táctil insuficiente
  const tactil = [];
  for (const el of document.querySelectorAll('button, a, input[type="checkbox"], select')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height < 40 || r.width < 24) {
      tactil.push(`${descripcion(el)} (${Math.round(r.width)}x${Math.round(r.height)})`);
    }
  }

  return {
    desborde,
    scrollW,
    anchoVentana,
    anchos: anchos.slice(0, 6),
    pequeno: [...pequeno].slice(0, 6),
    tactil: tactil.slice(0, 8),
    problemas,
  };
}

const server = await servir();
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

const filas = [];
const detalles = [];

for (const [pagina, rol, layout] of PAGINAS) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.ancho, height: vp.alto,
      deviceScaleFactor: 1,
      isMobile: vp.movil, hasTouch: vp.movil,
    });
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));

    try {
      await page.goto(
        `http://127.0.0.1:${PUERTO}/index.html?page=${pagina}&role=${rol}&layout=${layout}`,
        { waitUntil: 'networkidle0', timeout: 20000 }
      );
      await page.waitForFunction('window.__LISTO__ === true', { timeout: 8000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 250));

      const res = await page.evaluate(auditar);
      filas.push({ pagina, rol, vp: vp.nombre, ancho: vp.ancho, movil: vp.movil, ...res, errores });
      if (res.desborde > 1 || res.pequeno.length || res.tactil.length || errores.length) {
        detalles.push({ pagina, rol, vp: vp.nombre, ancho: vp.ancho, movil: vp.movil, ...res, errores });
      }
    } catch (e) {
      filas.push({ pagina, rol, vp: vp.nombre, ancho: vp.ancho, desborde: -1, error: e.message,
        anchos: [], pequeno: [], tactil: [], errores });
    } finally {
      await page.close();
    }
  }
}

await browser.close();
server.close();

// ------------------------------- informe -------------------------------
const anchosVp = VIEWPORTS.map((v) => v.ancho);
console.log('\n  DESBORDE HORIZONTAL (px que la página se sale de la pantalla)');
console.log('  ' + 'PÁGINA'.padEnd(22) + anchosVp.map((a) => String(a).padStart(7)).join(''));
console.log('  ' + '-'.repeat(22 + 7 * anchosVp.length));

const vistas = new Map();
for (const f of filas) {
  const k = `${f.pagina} (${f.rol})`;
  if (!vistas.has(k)) vistas.set(k, {});
  vistas.get(k)[f.ancho] = f.desborde;
}
let conDesborde = 0;
for (const [k, v] of vistas) {
  const celdas = anchosVp.map((a) => {
    const d = v[a];
    if (d === undefined) return '   —  ';
    if (d < 0) return '  ERR ';
    if (d > 1) { conDesborde++; return String('+' + d).padStart(7); }
    return '     ok';
  });
  console.log('  ' + k.padEnd(22) + celdas.join(''));
}

const textoPequeno = new Set();
const tactilMal = new Set();
const erroresJs = new Set();
for (const d of detalles) {
  d.pequeno.forEach((x) => textoPequeno.add(x));
  // El mínimo de 44px sólo aplica a pantallas táctiles; en escritorio se usa ratón.
  if (d.movil) d.tactil.forEach((x) => tactilMal.add(`${x} — ${d.pagina} @${d.ancho}px`));
  d.errores.forEach((x) => erroresJs.add(x));
}

if (conDesborde) {
  console.log('\n  DETALLE DE LOS DESBORDES:');
  for (const d of detalles.filter((x) => x.desborde > 1)) {
    console.log(`   · ${d.pagina} (${d.rol}) @${d.ancho}px → se sale ${d.desborde}px`);
    d.anchos.slice(0, 3).forEach((a) => console.log(`       ${a.el}  (+${a.sobra}px)`));
  }
}

if (textoPequeno.size) {
  console.log('\n  TEXTO POR DEBAJO DE 12px:');
  [...textoPequeno].slice(0, 12).forEach((t) => console.log('   · ' + t));
}

if (tactilMal.size) {
  console.log('\n  ÁREA TÁCTIL PEQUEÑA (< 40px de alto):');
  [...tactilMal].slice(0, 15).forEach((t) => console.log('   · ' + t));
}

if (erroresJs.size) {
  console.log('\n  ERRORES DE JAVASCRIPT:');
  [...erroresJs].forEach((t) => console.log('   · ' + t));
}

const total = filas.length;
console.log(`\n  ${total - conDesborde}/${total} vistas sin desborde horizontal`);
console.log(`  ${PAGINAS.length} páginas x ${VIEWPORTS.length} tamaños (${anchosVp.join(', ')} px)`);

console.log(`  ${tactilMal.size} controles táctiles por debajo del mínimo en móvil`);
console.log(`  ${textoPequeno.size} textos por debajo de 12px`);

process.exit(conDesborde || erroresJs.size || tactilMal.size || textoPequeno.size ? 1 : 0);
