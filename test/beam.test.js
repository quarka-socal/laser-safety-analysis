'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LE, near } = require('./helpers');
const B = LE.beam;

/** Kaba kuvvet 2B integral: açıklıktan geçen güç oranı (referans; toplam güç analitik). */
function bruteFraction(sec, D, n) {
  n = n || 600;
  const R = D / 2;
  const h = (2 * R) / n;
  let inside = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = -R + (i + 0.5) * h;
      const y = -R + (j + 0.5) * h;
      if (x * x + y * y <= R * R) inside += I(sec, x, y) * h * h;
    }
  }
  const total = sec.profile === 'tophat-rect' ? sec.dx * sec.dy : (Math.PI * sec.dx * sec.dy) / 4;
  return inside / total;
}
function I(sec, x, y) {
  if (sec.profile === 'gauss') return Math.exp(-Math.pow(2 * x / sec.dx, 2) - Math.pow(2 * y / sec.dy, 2));
  if (sec.profile === 'tophat-ellipse') return Math.pow(2 * x / sec.dx, 2) + Math.pow(2 * y / sec.dy, 2) <= 1 ? 1 : 0;
  return Math.abs(x) <= sec.dx / 2 && Math.abs(y) <= sec.dy / 2 ? 1 : 0;
}

test('dairesel Gauss: 1 − exp(−(D/d)²) ve 1/e çapı içinde %63', () => {
  near(B.fractionInAperture({ profile: 'gauss', dx: 1, dy: 1 }, 1), 1 - Math.exp(-1), 1e-12);
  near(B.fractionInAperture({ profile: 'gauss', dx: 7e-3, dy: 7e-3 }, 3.5e-3), 1 - Math.exp(-0.25), 1e-12);
  near(B.fractionInAperture({ profile: 'gauss', dx: 1e-3, dy: 1e-3 }, 7e-3), 1, 1e-12);
});

test('eliptik Gauss açısal integrali kaba kuvvet 2B integral ile uyumlu', () => {
  for (const [dx, dy, D] of [[2, 1, 1.5], [10, 1, 3], [1, 4, 0.7], [3, 3, 2]]) {
    const sec = { profile: 'gauss', dx, dy };
    near(B.fractionInAperture(sec, D), bruteFraction(sec, D, 800), 2e-3, 'Gauss ' + dx + '×' + dy + ' D=' + D);
  }
});

test('düz tepe elips ve dikdörtgen: alan kesişimi', () => {
  // elle: 4×2 dikdörtgen ∩ R = 1,5 daire = π·R² − 2·kesit = 5,51982 → oran 0,689977
  near(B.fractionInAperture({ profile: 'tophat-rect', dx: 4, dy: 2 }, 3), 0.689977, 1e-5);
  near(B.fractionInAperture({ profile: 'tophat-ellipse', dx: 4, dy: 4 }, 2), 0.25, 1e-12);
  near(B.fractionInAperture({ profile: 'tophat-ellipse', dx: 4, dy: 4 }, 5), 1, 1e-12);
  for (const [dx, dy, D] of [[4, 2, 3], [6, 1, 2.5]]) {
    const sec = { profile: 'tophat-ellipse', dx, dy };
    near(B.fractionInAperture(sec, D), bruteFraction(sec, D, 800), 3e-3, 'elips ' + dx + '×' + dy);
  }
  for (const [dx, dy, D] of [[4, 2, 3], [2, 2, 2.5], [10, 1, 4], [1, 1, 0.5]]) {
    const sec = { profile: 'tophat-rect', dx, dy };
    near(B.fractionInAperture(sec, D), bruteFraction(sec, D, 800), 3e-3, 'dikdörtgen ' + dx + '×' + dy + ' D=' + D);
  }
});

test('ışın büyümesi: karesel ve doğrusal model', () => {
  const beam = { profile: 'gauss', dx: 2e-3, dy: 2e-3, phix: 1e-3, phiy: 1e-3 };
  near(B.sectionAt(beam, 100, 'quad').dx, Math.sqrt(4e-6 + 0.01), 1e-12);
  near(B.sectionAt(beam, 100, 'linear').dx, 2e-3 + 0.1, 1e-12);
  assert.equal(B.toD63(1, '1/e2', 'gauss'), 1 / Math.SQRT2);
  assert.equal(B.toD63(1, '1/e2', 'tophat-ellipse'), 1);
});

test('küçük ışın kuralı: <1 mm ışında tepe değer kullanılır', () => {
  const sec = { profile: 'gauss', dx: 0.5e-3, dy: 0.5e-3 };
  const ef = B.exposureFactor(sec, 3.5e-3, true);
  assert.equal(ef.peak, true);
  near(ef.k, 4 / (Math.PI * 0.25e-6), 1e-12);
  const ef2 = B.exposureFactor(sec, 3.5e-3, false);
  assert.equal(ef2.peak, false);
  assert.ok(ef2.k < ef.k);
});
