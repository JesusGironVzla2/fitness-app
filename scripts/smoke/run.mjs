import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.SVGElement = dom.window.SVGElement;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
dom.window.ResizeObserver = global.ResizeObserver;
dom.window.matchMedia = global.matchMedia;
global.IS_REACT_ACT_ENVIRONMENT = false;

// Silenciar el ruido esperado (avisos de recharts sobre tamaño 0, etc.)
const realError = console.error;
const captured = [];
global.__SMOKE_PAGE__ = '(inicio)';
console.error = (...args) => {
  const msg = args.map(a => (a && a.stack) || String(a)).join(' ');
  captured.push(`[${global.__SMOKE_PAGE__}] ${msg}`);
};

const { run } = await import('./out/entry.js');

const roles = ['admin', 'trainer', 'student'];
let failures = 0;
const rows = [];

for (const role of roles) {
  const results = await run(role);
  for (const r of results) {
    if (!r.ok) failures++;
    rows.push(r);
  }
}

console.error = realError;

const byPage = new Map();
for (const r of rows) {
  if (!byPage.has(r.path)) byPage.set(r.path, []);
  byPage.get(r.path).push(r);
}

console.log('\n  RUTA                  ADMIN  TRAINER  STUDENT   MUESTRA DE TEXTO RENDERIZADO');
console.log('  ' + '-'.repeat(96));
for (const [p, list] of byPage) {
  const mark = (r) => (r.ok ? '  OK  ' : ' FALLA');
  console.log('  ' + p.padEnd(22) + list.map(mark).join(' ') + '   "' + list[0].marker + '"');
}

const notRendered = rows.filter(r => !r.rendered);
if (notRendered.length) {
  console.log('\n  SIN MARCADOR (el componente no llegó a pintar su contenido):');
  for (const r of notRendered) console.log(`   - [${r.role}] ${r.path}: falta "${r.marker}" | texto: ${r.sample}`);
}

const errored = rows.filter(r => r.errors.length);
if (errored.length) {
  console.log('\n  ERRORES DE RENDER:');
  for (const r of errored) console.log(`   - [${r.role}] ${r.path}: ${r.errors.join(' | ')}`);
}

// Errores reales de React capturados por consola (no los avisos de recharts)
const realErrors = captured.filter(m =>
  !/width\(0\) and height\(0\)|defaultProps|not wrapped in act|Warning:/i.test(m));
if (realErrors.length) {
  console.log('\n  CONSOLE.ERROR RELEVANTES:');
  for (const m of [...new Set(realErrors)].slice(0, 10)) console.log('   - ' + m.split('\n')[0].slice(0, 160));
}

console.log(`\n  ${rows.length - failures}/${rows.length} renders correctos (${roles.length} roles x ${byPage.size} páginas)`);
process.exit(failures ? 1 : 0);
