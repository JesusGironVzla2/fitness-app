import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
for (const k of ['HTMLElement','Element','Node','SVGElement','MouseEvent','Event','getComputedStyle']) global[k] = dom.window[k];
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.ResizeObserver = global.ResizeObserver;
global.IS_REACT_ACT_ENVIRONMENT = false;
const realError = console.error; console.error = () => {};

const { run } = await import('./out/lastsession.js');
const rows = await run();
console.error = realError;

let fallos = 0;
console.log('\n  "ÚLTIMA VEZ LEVANTASTE…"');
console.log('  ' + '-'.repeat(52));
for (const r of rows) {
  const ok = r.obtenido === r.esperado;
  if (!ok) fallos++;
  console.log('  ' + (ok ? 'OK  ' : 'FALLA') + ' ' + r.caso);
}
console.log(`\n  ${rows.length - fallos}/${rows.length} correctos`);
process.exit(fallos ? 1 : 0);
