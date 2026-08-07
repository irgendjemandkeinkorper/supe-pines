import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadMotion({ reducedMotion } = {}) {
  globalThis.__MOTION_TEST_REDUCED = reducedMotion === true;
  const suffix = Math.random().toString(36).slice(2);
  return await import('../js/ui/motion.js?v=' + suffix);
}

function fakeEl(animateImpl) {
  return {
    animate: animateImpl || null,
    addEventListener: null,
    removeEventListener: null,
    classList: {
      _peeking: false,
      add(c) { if (c === 'peeking') this._peeking = true; },
      remove(c) { if (c === 'peeking') this._peeking = false; },
      contains(c) { return c === 'peeking' ? this._peeking : false; },
    },
    querySelector(sel) {
      if (sel === '.hero-flip-inner') {
        let handler = null;
        return {
          addEventListener(ev, fn) { if (ev === 'transitionend') handler = fn; },
          removeEventListener() { handler = null; },
          _fireTransitionEnd() { if (handler) handler({ propertyName: 'transform' }); },
        };
      }
      return null;
    },
  };
}

test('exports all nine named events', async () => {
  const m = await loadMotion({ reducedMotion: false });
  const names = ['deal','play','buyIn','trade','heroTurn','toneTally',
    'secretReveal','closeOpen','dossierEntry'];
  for (const n of names) {
    assert.equal(typeof m[n], 'function', 'missing: ' + n);
  }
});

test('all functions return thenables', async () => {
  const m = await loadMotion({ reducedMotion: false });
  const el = fakeEl(() => ({ finished: Promise.resolve(), cancel() {} }));
  const fns = [m.deal,m.play,m.buyIn,m.trade,m.heroTurn,
    m.toneTally,m.secretReveal,m.closeOpen,m.dossierEntry];
  for (const fn of fns) {
    const r = fn(el);
    assert.ok(r && typeof r.then === 'function');
  }
});

test('reduced-motion bypasses animate entirely', async () => {
  const m = await loadMotion({ reducedMotion: true });
  let called = false;
  const el = fakeEl(() => { called = true; return { finished: Promise.resolve(), cancel() {} }; });
  await m.deal(el); await m.play(el); await m.buyIn(el);
  await m.trade(el); await m.heroTurn(el); await m.toneTally(el);
  await m.secretReveal(el); await m.closeOpen(el); await m.dossierEntry(el);
  assert.equal(called, false);
});

test('deal animates card and optional slot', async () => {
  const m = await loadMotion({ reducedMotion: false });
  const calls = [];
  const card = fakeEl((kf, opts) => {
    calls.push({t:'card',opts}); return { finished: Promise.resolve(), cancel() {} };
  });
  const slot = fakeEl((kf, opts) => {
    calls.push({t:'slot',opts}); return { finished: Promise.resolve(), cancel() {} };
  });
  await m.deal(card, slot);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].opts.duration > 0);
});

test('deal null slot still animates card', async () => {
  const m = await loadMotion({ reducedMotion: false });
  let ok = false;
  const el = fakeEl(() => { ok = true; return { finished: Promise.resolve(), cancel() {} }; });
  await m.deal(el, null);
  assert.equal(ok, true);
});

test('heroTurn toggles peeking class', async () => {
  const m = await loadMotion({ reducedMotion: false });
  const el = fakeEl();
  el.animate = null;
  const p = m.heroTurn(el);
  const inner = el.querySelector('.hero-flip-inner');
  if (inner && inner._fireTransitionEnd) inner._fireTransitionEnd();
  await p;
  assert.equal(el.classList.contains('peeking'), false);
});

test('dossierEntry uses translateY keyframes', async () => {
  const m = await loadMotion({ reducedMotion: false });
  let kf = null;
  const el = fakeEl((k) => { kf = k; return { finished: Promise.resolve(), cancel() {} }; });
  await m.dossierEntry(el);
  assert.ok(Array.isArray(kf) && kf.length >= 2);
  assert.ok((kf[0].transform||'').includes('translateY'));
});

test('closeOpen uses fadein-like keyframes with blur', async () => {
  const m = await loadMotion({ reducedMotion: false });
  let kf = null;
  const el = fakeEl((k) => { kf = k; return { finished: Promise.resolve(), cancel() {} }; });
  await m.closeOpen(el);
  assert.equal(kf[0].opacity, 0);
  assert.ok(typeof kf[0].filter === 'string');
});

test('no engine or sync imports', async () => {
  const src = readFileSync(join(__dirname, '..', 'js', 'ui', 'motion.js'), 'utf-8');
  assert.ok(!src.includes("from '../engine/"));
  const lines = src.split('\n').filter(l => l.trim().startsWith('import '));
  for (const l of lines) {
    assert.ok(!l.includes('../engine/'), 'import: ' + l.trim());
    assert.ok(!l.includes('../sync/'), 'import: ' + l.trim());
  }
});

test('toneTally and secretReveal use arrival keyframes', async () => {
  const m = await loadMotion({ reducedMotion: false });
  let a = null, b = null;
  const ea = fakeEl((k) => { a = k; return { finished: Promise.resolve(), cancel() {} }; });
  const eb = fakeEl((k) => { b = k; return { finished: Promise.resolve(), cancel() {} }; });
  await m.toneTally(ea);
  await m.secretReveal(eb);
  assert.equal(a[0].opacity, 0);
  assert.equal(b[0].opacity, 0);
  assert.ok(a.find(k => k.opacity === 1));
  assert.ok(b.find(k => k.opacity === 1));
});
