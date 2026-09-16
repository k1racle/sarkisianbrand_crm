/** Pure Node mock checks. No browser, build, server, real DOM/network or files written. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('../../backend/node_modules/typescript');
const frontend = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(frontend, 'composables/useStorefrontCardTilt.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, callback) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(callback); }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
  emit(name) { for (const callback of this.listeners.get(name) || []) callback(); }
  count() { return [...this.listeners.values()].reduce((sum, callbacks) => sum + callbacks.size, 0); }
}
class Element {
  constructor() {
    this.reads = 0; this.vars = new Map(); this.classes = new Set();
    this.style = { setProperty: (name, value) => this.vars.set(name, value) };
    this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) };
  }
  getBoundingClientRect() { this.reads++; return { left: 100, top: 100, width: 600, height: 300 }; }
}
function setup({ fine = true, reduced = false } = {}) {
  const window = new Events(), document = new Events(), fineMedia = new Events(), reducedMedia = new Events();
  fineMedia.matches = fine; reducedMedia.matches = reduced; document.hidden = false;
  window.matchMedia = query => query.includes('hover: hover') ? fineMedia : reducedMedia;
  const mount = [], unmount = [], frames = new Map(); let nextFrame = 0;
  const exports = {};
  vm.runInNewContext(js, { exports, window, document, HTMLElement: Element, onMounted: callback => mount.push(callback), onBeforeUnmount: callback => unmount.push(callback), requestAnimationFrame: callback => { const id = nextFrame++; frames.set(id, callback); return id; }, cancelAnimationFrame: id => frames.delete(id) });
  const tilt = exports.useStorefrontCardTilt();
  assert.equal(window.count(), 0, 'SSR setup accesses no window listeners');
  mount.forEach(callback => callback());
  const element = new Element();
  const pointer = (clientX, clientY, pointerType = 'mouse') => ({ currentTarget: element, clientX, clientY, pointerType });
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
  const neutral = () => { assert.equal(frames.size, 0); assert(!element.classes.has('is-card-tilting')); assert.equal(element.vars.get('--sb-card-tilt-x'), '0deg'); assert.equal(element.vars.get('--sb-card-tilt-y'), '0deg'); };
  return { window, document, fineMedia, reducedMedia, tilt, element, pointer, flush, neutral, frames, unmount };
}

const h = setup();
h.tilt.onPointerEnter(h.pointer(400, 250));
for (let index = 0; index < 100; index++) h.tilt.onPointerMove(h.pointer(9999, -9999));
assert.equal(h.frames.size, 1, 'RAF writes are coalesced');
h.flush();
assert.equal(h.element.vars.get('--sb-card-tilt-x'), '3.000deg');
assert.equal(h.element.vars.get('--sb-card-tilt-y'), '3.000deg');
assert.equal(h.element.reads, 1, 'No transformed-bounds feedback/layout reads on move');
h.tilt.onPointerMove(h.pointer(-9999, 9999)); h.flush();
assert.equal(h.element.vars.get('--sb-card-tilt-x'), '-3.000deg');
assert.equal(h.element.vars.get('--sb-card-tilt-y'), '-3.000deg');
for (const reset of [() => h.tilt.onPointerLeave(), () => h.tilt.onPointerCancel(), () => h.window.emit('blur'), () => h.window.emit('resize'), () => { h.document.hidden = true; h.document.emit('visibilitychange'); }, () => { h.reducedMedia.matches = true; h.reducedMedia.emit('change'); }, () => { h.fineMedia.matches = false; h.fineMedia.emit('change'); }]) {
  h.document.hidden = false; h.reducedMedia.matches = false; h.fineMedia.matches = true;
  h.tilt.onPointerEnter(h.pointer(700, 100)); // Leave a pending RAF to test cancellation.
  reset(); h.neutral(); h.flush(); h.neutral();
}
for (const preferences of [{ fine: false }, { reduced: true }]) {
  const disabled = setup(preferences);
  disabled.tilt.onPointerEnter(disabled.pointer(700, 100)); disabled.tilt.onPointerMove(disabled.pointer(700, 100)); disabled.flush();
  assert.equal(disabled.element.reads, 0); assert.equal(disabled.frames.size, 0); assert.equal(disabled.element.vars.size, 0);
  disabled.unmount.forEach(callback => callback());
}
h.fineMedia.matches = true; h.reducedMedia.matches = false;
for (const pointerType of ['touch', 'pen']) { h.tilt.onPointerEnter(h.pointer(700, 100, pointerType)); assert.equal(h.frames.size, 0); }
h.tilt.onPointerEnter(h.pointer(700, 100)); h.unmount.forEach(callback => callback()); h.neutral();
assert.equal(h.window.count() + h.document.count() + h.fineMedia.count() + h.reducedMedia.count(), 0, 'Lifecycle cleanup removes all listeners');
const css = fs.readFileSync(path.join(frontend, 'assets/css/storefront-glass.css'), 'utf8');
assert(css.includes('perspective(1200px) rotateX(var(--sb-card-tilt-x, 0deg)) rotateY(var(--sb-card-tilt-y, 0deg))'));
assert(css.includes('transition: transform 650ms') && css.includes('transition-duration: 220ms'));
console.log(JSON.stringify({ pureMockTests: 'PASS', maxDegrees: 3, cachedGeometry: true, rafCoalesced: true, resetAndCleanup: true, touchPenAndReducedDisabled: true, visualTest: 'NOT_RUN', actualNetworkRequests: 0 }));
