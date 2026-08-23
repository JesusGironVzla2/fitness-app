import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
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
dom.window.ResizeObserver = global.ResizeObserver;
global.IS_REACT_ACT_ENVIRONMENT = false;
const realError = console.error;
console.error = () => {};

const { run } = await import('./out/calc.js');
const rows = await run();
console.error = realError;

let fallos = 0;
console.log('\n  CASO                                        ESPERADO      OBTENIDO');
console.log('  ' + '-'.repeat(74));
for (const r of rows) {
  const ok = r.obtenido === r.esperado;
  if (!ok) fallos++;
  console.log('  ' + (ok ? 'OK  ' : 'FALLA') + ' ' + r.caso.padEnd(38) + r.esperado.padEnd(14) + r.obtenido);
}
console.log(`\n  ${rows.length - fallos}/${rows.length} cálculos correctos`);
process.exit(fallos ? 1 : 0);
