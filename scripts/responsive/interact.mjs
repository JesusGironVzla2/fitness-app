/**
 * Pruebas de interacción en móvil con Chrome real.
 *
 * La auditoría estática sólo mira el estado inicial. Aquí se comprueban los
 * estados que sólo aparecen al tocar: el menú lateral desplegable y los modales,
 * que son donde más fácil se rompe un diseño en pantallas estrechas.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out');
const SHOTS = path.join(here, 'capturas');
const PUERTO = 5322;

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => p && fs.existsSync(p));

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml' };

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

const desborde = () =>
  Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;

const resultados = [];
const anota = (caso, ok, detalle = '') => resultados.push({ caso, ok, detalle });

const server = await servir();
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

fs.mkdirSync(SHOTS, { recursive: true });

async function abrir(page, pagina, rol, ancho, alto = 800) {
  await page.setViewport({ width: ancho, height: alto, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PUERTO}/index.html?page=${pagina}&role=${rol}`,
    { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForFunction('window.__LISTO__ === true', { timeout: 8000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 250));
}

// ---------------------------------------------- 1. Menú lateral en móvil
{
  const page = await browser.newPage();
  await abrir(page, 'dashboard', 'student', 390, 844);

  // Oculto de inicio
  const inicial = await page.evaluate(() => {
    const s = document.querySelector('.sidebar');
    return { visible: s.getBoundingClientRect().right > 0, x: Math.round(s.getBoundingClientRect().x) };
  });
  anota('Menú lateral oculto al cargar en móvil', inicial.visible === false, `x=${inicial.x}px`);

  // El botón hamburguesa existe y es pulsable
  const btn = await page.evaluate(() => {
    const b = document.querySelector('.mobile-toggle');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), visible: getComputedStyle(b).display !== 'none' };
  });
  anota('Botón hamburguesa visible y de 44px', !!btn && btn.visible && btn.h >= 44 && btn.w >= 44,
    btn ? `${btn.w}x${btn.h}` : 'no existe');

  // Abrir
  await page.click('.mobile-toggle');
  await new Promise((r) => setTimeout(r, 450));
  const abierto = await page.evaluate(() => {
    const s = document.querySelector('.sidebar');
    const r = s.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      ancho: Math.round(r.width),
      overlay: !!document.querySelector('.sidebar-overlay'),
      enlaces: document.querySelectorAll('.sidebar-nav .nav-item').length,
      desborde: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    };
  });
  anota('El menú se abre al pulsar', abierto.x === 0, `x=${abierto.x}px, ancho=${abierto.ancho}px`);
  anota('Aparece la capa oscura de fondo', abierto.overlay);
  anota('Se ven todos los enlaces de navegación', abierto.enlaces >= 9, `${abierto.enlaces} enlaces`);
  anota('El menú abierto no provoca desborde', abierto.desborde <= 1, `${abierto.desborde}px`);
  anota('El menú no ocupa toda la pantalla', abierto.ancho <= 390, `${abierto.ancho}px de 390px`);

  await page.screenshot({ path: path.join(SHOTS, 'menu-movil-390.png') });

  // Cerrar con la X
  await page.click('.mobile-close');
  await new Promise((r) => setTimeout(r, 450));
  const cerrado = await page.evaluate(() => Math.round(document.querySelector('.sidebar').getBoundingClientRect().right));
  anota('El menú se cierra con la X', cerrado <= 0, `right=${cerrado}px`);

  await page.close();
}

// ------------------------------------------------- 2. Modales en móvil
const MODALES = [
  { pagina: 'alumnos', rol: 'trainer', boton: 'Registrar Alumno', nombre: 'alta-alumno' },
  { pagina: 'progreso', rol: 'student', boton: 'Registrar Log', nombre: 'registrar-log' },
  { pagina: 'control-corporal', rol: 'student', boton: 'Registrar Medida', nombre: 'registrar-medida' },
  { pagina: 'ejercicios', rol: 'admin', boton: 'Nuevo Ejercicio', nombre: 'nuevo-ejercicio' },
  { pagina: 'rutinas', rol: 'trainer', boton: 'Asignar Rutina', nombre: 'asignar-rutina' },
];

for (const ancho of [320, 390]) {
  for (const m of MODALES) {
    const page = await browser.newPage();
    await abrir(page, m.pagina, m.rol, ancho, 800);

    const pulsado = await page.evaluate((texto) => {
      const b = [...document.querySelectorAll('button')]
        .find((x) => x.textContent.replace(/\s+/g, ' ').trim().includes(texto));
      if (!b) return false;
      b.click();
      return true;
    }, m.boton);

    if (!pulsado) {
      anota(`Modal "${m.nombre}" @${ancho}px`, false, 'no se encontró el botón');
      await page.close();
      continue;
    }

    await new Promise((r) => setTimeout(r, 400));
    const est = await page.evaluate(() => {
      const modal = document.querySelector('.modal');
      if (!modal) return null;
      const capa = document.querySelector('.modal-overlay');

      // ¿Se puede llegar al principio del formulario? En un modal más alto que
      // la pantalla, si la capa no permite desplazarse, los primeros campos
      // quedan cortados e inalcanzables.
      if (capa) capa.scrollTop = 0;
      const rTop = modal.getBoundingClientRect();
      const primerCampo = modal.querySelector('input, select, textarea');
      const inicioAlcanzable = rTop.top >= -1 &&
        (!primerCampo || primerCampo.getBoundingClientRect().top >= -1);

      // ¿Y al final, donde están los botones de guardar? Algunos modales tienen
      // su propio scroll interno (max-height: 90vh), así que hay que desplazar
      // tanto la capa como el modal.
      if (capa) capa.scrollTop = capa.scrollHeight;
      modal.scrollTop = modal.scrollHeight;
      const botones = modal.querySelector('.modal-actions');
      const finAlcanzable = !botones ||
        botones.getBoundingClientRect().bottom <= window.innerHeight + 1;
      if (capa) capa.scrollTop = 0;
      modal.scrollTop = 0;

      // ¿Hay algo dibujado por encima del modal en su misma zona?
      const centro = document.elementFromPoint(
        Math.round(rTop.left + rTop.width / 2),
        Math.round(Math.max(10, Math.min(window.innerHeight - 10, rTop.top + 40)))
      );
      const tapado = centro ? !modal.contains(centro) && centro !== modal : false;

      const r = modal.getBoundingClientRect();
      const campos = modal.querySelectorAll('input, select, textarea');
      let estrechos = 0;
      campos.forEach((c) => { if (c.getBoundingClientRect().width < 80) estrechos++; });
      return {
        ancho: Math.round(r.width),
        izq: Math.round(r.left),
        der: Math.round(r.right),
        ventana: window.innerWidth,
        desborde: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        campos: campos.length,
        estrechos,
        alto: Math.round(r.height),
        alturaVentana: window.innerHeight,
        inicioAlcanzable,
        finAlcanzable,
        tapado,
        tapadoPor: tapado && centro ? (centro.className || centro.tagName) : '',
      };
    });

    if (!est) {
      anota(`Modal "${m.nombre}" @${ancho}px`, false, 'no se abrió');
    } else {
      const cabe = est.izq >= -1 && est.der <= est.ventana + 1;
      anota(`Modal "${m.nombre}" @${ancho}px cabe en pantalla`, cabe,
        `${est.ancho}px (${est.izq} → ${est.der} de ${est.ventana})`);
      anota(`Modal "${m.nombre}" @${ancho}px sin desborde`, est.desborde <= 1, `${est.desborde}px`);
      if (est.campos > 0) {
        anota(`Modal "${m.nombre}" @${ancho}px campos usables`, est.estrechos === 0,
          `${est.estrechos} de ${est.campos} por debajo de 80px`);
      }
      anota(`Modal "${m.nombre}" @${ancho}px inicio alcanzable`, est.inicioAlcanzable,
        `alto ${est.alto}px / pantalla ${est.alturaVentana}px`);
      anota(`Modal "${m.nombre}" @${ancho}px botones alcanzables`, est.finAlcanzable);
      anota(`Modal "${m.nombre}" @${ancho}px nada lo tapa`, !est.tapado,
        est.tapado ? `tapado por ${String(est.tapadoPor).slice(0, 30)}` : '');
      if (ancho === 320) {
        await page.screenshot({ path: path.join(SHOTS, `modal-${m.nombre}-320.png`) });
      }
    }
    await page.close();
  }
}

// -------------------------------------- 3. Capturas de páginas clave
for (const [pagina, rol] of [['dashboard', 'student'], ['control-corporal', 'student'],
                             ['fuerza-hipertrofia', 'student'], ['alumnos', 'trainer']]) {
  const page = await browser.newPage();
  await abrir(page, pagina, rol, 390, 844);
  // El layout usa 100vh con scroll interno, así que `fullPage` sólo captura el
  // viewport. Se libera la altura para poder ver la página entera de un vistazo.
  await page.evaluate(() => {
    const c = document.querySelector('.layout-container');
    const m = document.querySelector('.main-content');
    const p = document.querySelector('.page-content');
    if (c) { c.style.height = 'auto'; c.style.overflow = 'visible'; }
    if (m) m.style.overflow = 'visible';
    if (p) p.style.overflow = 'visible';
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(SHOTS, `${pagina}-390.png`), fullPage: true });
  await page.close();
}

await browser.close();
server.close();

console.log('\n  INTERACCIÓN EN MÓVIL');
console.log('  ' + '-'.repeat(72));
let fallos = 0;
for (const r of resultados) {
  if (!r.ok) fallos++;
  console.log('  ' + (r.ok ? 'OK   ' : 'FALLA') + ' ' + r.caso.padEnd(46) + (r.detalle || ''));
}
console.log(`\n  ${resultados.length - fallos}/${resultados.length} correctos`);
console.log(`  Capturas en scripts/responsive/capturas/`);
process.exit(fallos ? 1 : 0);
