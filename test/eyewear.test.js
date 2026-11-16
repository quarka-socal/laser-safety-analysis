'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LE, gauss } = require('./helpers');
const A = LE.analysis;
const W = LE.eyewear;

const run = (inp) => A.analyze(inp).eyewear;

test('EN 207 çalışma modu sınırları', () => {
  assert.equal(W.pulseMode(0.3), 'D');
  assert.equal(W.pulseMode(0.25), 'I');
  assert.equal(W.pulseMode(1e-3), 'I');
  assert.equal(W.pulseMode(1e-6), 'R');
  assert.equal(W.pulseMode(1e-7), 'R');
  assert.equal(W.pulseMode(1e-9), 'M');
  assert.equal(W.pulseMode(1e-12), 'M');
  assert.equal(W.band(315), 'UV');
  assert.equal(W.band(316), 'VIS');
  assert.equal(W.band(1400), 'VIS');
  assert.equal(W.band(1401), 'IR');
});

test('EN 207 tablo eşikleri: LB n üst sınırına eşit yoğunluk LB n verir', () => {
  for (let n = 1; n <= 10; n++) {
    assert.equal(W.lbFrom(Math.pow(10, n + 1), W.BASE.D.VIS).n, n, 'D VIS');
    assert.equal(W.lbFrom(5 * Math.pow(10, n - 3), W.BASE.IR.VIS).n, n, 'IR VIS');
    assert.equal(W.lbFrom(1.5 * Math.pow(10, n - 4), W.BASE.M.VIS).n, n, 'M VIS');
    assert.equal(W.lbFrom(Math.pow(10, n - 3), W.BASE.D.UV).n, n, 'D UV');
    assert.equal(W.lbFrom(3 * Math.pow(10, n + 1), W.BASE.IR.UV).n, n, 'IR UV');
    assert.equal(W.lbFrom(Math.pow(10, n + 2), W.BASE.IR.IR).n, n, 'IR IR');
    assert.equal(W.lbFrom(Math.pow(10, n + 11), W.BASE.M.IR).n, n, 'M IR');
  }
  assert.equal(W.lbFrom(1.0001e7, W.BASE.D.VIS).n, 7, 'eşiği aşınca bir üst seviye');
});

test('yayımlanmış EN 207 örnekleri', () => {
  // Lasermet: 532 nm, 1 mJ, 7 ns, 10 kHz, en küçük çap 2 mm → D LB6, R LB7
  const lm = run({ lambda: 532, mode: 'rp', Q: 1e-3, tau: 7e-9, f: 1e4, T: 0.25, beam: gauss(2e-3, 1e-3) });
  assert.equal(lm.marking, 'D 532 LB6 + R 532 LB7');
  // lasersafety (readthedocs) örnekleri
  assert.equal(run({ lambda: 1064, mode: 'cw', P: 10, T: 10, beam: gauss(4e-3, 1e-3) }).marking, 'D 1064 LB5');
  assert.equal(run({ lambda: 800, mode: 'rp', Q: 4.5e-6, tau: 200e-15, f: 2e5, T: 10, beam: gauss(3e-3, 1e-3) }).marking, 'D 800 LB5 + M 800 LB6');
  const ir = run({ lambda: 1500, mode: 'rp', P: 0.02, tau: 200e-15, f: 2e5, T: 10, beam: gauss(3e-3, 1e-3) });
  assert.equal(ir.marking, 'DM 1500 LB1');
  // Innsbruck kuantum optik grubu: 632 nm, 10 mW, 5 mm → D LB2
  assert.equal(run({ lambda: 632, mode: 'cw', P: 0.01, T: 0.25, beam: gauss(5e-3, 1e-3) }).marking, 'D 632 LB2');
});

test('EN 207: UV ve IR bantları, N düzeltmesi yalnız 400–1400 nm', () => {
  const uv = run({ lambda: 248, mode: 'rp', Q: 0.1, tau: 20e-9, f: 10, T: 100, beam: gauss(10e-3, 1e-3) });
  const r = uv.en207.find((i) => i.mode === 'R');
  assert.equal(r.k, 1, 'UV\'de N^¼ uygulanmaz');
  assert.equal(r.lb, 2);
  const vis = run({ lambda: 532, mode: 'rp', Q: 0.1, tau: 20e-9, f: 10, T: 0.25, beam: gauss(10e-3, 1e-3) });
  const rv = vis.en207.find((i) => i.mode === 'R');
  assert.equal(rv.N, 100);
  assert.ok(Math.abs(rv.k - Math.pow(100, 0.25)) < 1e-12);
});

test('EN 207: LB10 üstü uyarı verir', () => {
  const o = A.analyze({ lambda: 1064, mode: 'cw', P: 1e5, T: 10, beam: gauss(0.2e-3, 1e-3) });
  assert.ok(o.eyewear.en207[0].over);
  assert.ok(o.eyewear.warnings.some((w) => w.indexOf('LB10') >= 0));
});

test('EN 208 ayar gözlüğü RB seviyeleri', () => {
  const rb = (P) => run({ lambda: 532, mode: 'cw', P, T: 0.25, beam: gauss(2e-3, 1e-3) }).en208;
  assert.equal(rb(1e-3).rb, 1);
  assert.equal(rb(0.01).rb, 1);
  assert.equal(rb(0.011).rb, 2);
  assert.equal(rb(5).rb, 4);
  assert.equal(rb(100).rb, 5);
  const big = rb(200);
  assert.equal(big.applicable, false);
  assert.equal(run({ lambda: 1064, mode: 'cw', P: 1, T: 10, beam: gauss(2e-3, 1e-3) }).en208, null, 'görünür dışı: EN 208 yok');
  const p = run({ lambda: 532, mode: 'sp', Q: 2e-6, tau: 1e-8, beam: gauss(2e-3, 1e-3) }).en208;
  assert.equal(p.rb, 1);
});

test('gerekli OD tamsayıya yukarı yuvarlanır', () => {
  assert.equal(W.recommendedOD(0), 0);
  assert.equal(W.recommendedOD(4.01), 5);
  assert.equal(W.recommendedOD(5), 5);
});
