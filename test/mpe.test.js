'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LE, near } = require('./helpers');
const M = LE.mpe;

test('gömülü öz-denetim vektörlerinin tümü geçer', () => {
  const r = LE.selftest.runAll();
  const msg = r.failed.map((f) => f.name + ': beklenen ' + f.expected + ', bulunan ' + f.actual).join('\n');
  assert.equal(r.passed, r.total, msg);
});

test('ICNIRP 2013 Tablo 5 — görünür/IR-A retina termal satırları', () => {
  const H = (l, t) => M.eyeMPE_H(l, t, {});
  near(H(550, 5e-14), 5e-4, 1e-9, '100 fs altı: E ≤ 10¹⁰ W/m²');
  near(H(550, 1e-12), 1e-3, 1e-9);
  near(H(550, 1e-11), 2e-3, 1e-9, '10 ps sınırı');
  near(H(550, 5e-6), 2e-3, 1e-9, '5 µs dahil');
  near(H(550, 1e-5), 18 * Math.pow(1e-5, 0.75), 1e-9);
  near(H(694, 1e-3), 18 * Math.pow(1e-3, 0.75), 1e-9);
  near(H(700, 1e-9), 2e-3, 1e-9, 'C_A(700) = 1');
  near(H(1000, 1e-9), 2e-3 * Math.pow(10, 0.6), 1e-9);
  near(H(1049, 1e-12), 1e-3, 1e-9, '700–1050 nm ultra kısa darbede C_A yok');
  near(H(1050, 13e-6), 2e-2, 1e-9, '1050 nm, 13 µs dahil');
  near(H(1100, 1e-4), 90 * Math.pow(1e-4, 0.75), 1e-9);
  near(H(633, 100), 10 * 100, 1e-9, 't > 10 s nokta kaynak 10 W/m²');
  near(H(900, 100), 10 * Math.pow(10, 0.4) * 100, 1e-9);
});

test('ICNIRP 2013 Tablo 5 — fotokimyasal ikili sınır (400–600 nm)', () => {
  const H = (l, t) => M.eyeMPE_H(l, t, {});
  near(H(420, 50), 100, 1e-9);
  near(H(420, 1000), 1000, 1e-9);
  near(H(520, 1000), Math.min(1e4, Math.pow(10, 1.4) * 1000), 1e-9);
  near(H(599, 3e4), Math.min(10 * 3e4, Math.pow(10, 2.98) * 3e4), 1e-9);
  // 600 nm ve üstünde fotokimyasal sınır yok
  near(H(600, 1000), 1e4, 1e-9);
});

test('UV satırları: 180–302 nm 30 J/m², 302–315 nm muhafazakâr C₂, 315–400 nm', () => {
  const H = (l, t) => M.eyeMPE_H(l, t, {});
  near(H(193, 100), 30, 1e-12);
  near(H(301.9, 1), 30, 1e-12);
  near(H(303.5, 100), Math.pow(10, 0.2 * 8.5), 1e-9, 'C₂ < ICNIRP basamağı 60');
  near(H(309.5, 100), Math.pow(10, 0.2 * 14.5), 1e-9);
  near(H(314.9, 100), 6300, 1e-12, 'ICNIRP basamağı C₂\'den küçük');
  near(H(305, 1e-9), Math.min(100, 5.6e3 * Math.pow(1e-9, 0.25)), 1e-9, 'termal sınırla ikili');
  near(H(355, 1), 5600, 1e-12);
  near(H(355, 10), 1e4, 1e-12);
  near(H(399, 3e4), 1e4, 1e-12);
});

test('IR (1400 nm – 1 mm) satırları', () => {
  const H = (l, t) => M.eyeMPE_H(l, t, {});
  near(H(1450, 1e-6), 1e3, 1e-12);
  near(H(1450, 0.1), 5.6e3 * Math.pow(0.1, 0.25), 1e-9);
  near(H(1600, 5), 1e4, 1e-12);
  near(H(2000, 1e-4), 1e3, 1e-12);
  near(H(3000, 5e-8), 100, 1e-12);
  near(H(3000, 1e-6), 5.6e3 * Math.pow(1e-6, 0.25), 1e-9);
  near(H(10600, 1000), 1e6, 1e-12);
  near(H(1e6, 1), 5.6e3, 1e-12, '1 mm dahil');
});

test('ANSI 2014 kornea/lens ikili sınırı 1200–1400 nm', () => {
  const K = M.Klambda;
  near(K(1200), 100, 1e-12);
  near(K(1300), 10, 1e-12);
  near(K(1400), 1, 1e-12);
  // 1350 nm, t ≥ 10 s: min(300K+700, 2000·C_A) W/m²
  near(M.eyeMPE_H(1350, 100) / 100, 300 * Math.sqrt(10) + 700, 1e-9);
  // 1200 nm: retina sınırı belirleyici kalır
  near(M.eyeMPE_H(1200, 100) / 100, 50 * M.CC(1200), 1e-9);
});

test('MPE süreyle azalmaz — yalnız standardın kendi yuvarlama basamakları hariç', () => {
  // ICNIRP 2013 / IEC 60825-1:2014 tablolarında yuvarlanmış sabitler nedeniyle
  // bazı kırılma noktalarının hemen ardından küçük düşüşler vardır:
  //   5 µs  (400–1050 nm): 2,0·10⁻³ → 18·(5 µs)^0,75 = 1,903·10⁻³  (−%4,8)
  //   13 µs (1050–1400 nm): 2,0·10⁻² → 90·(13 µs)^0,75 = 1,946·10⁻²  (−%2,7)
  //   10 s  (retina, nokta kaynak): 18·10^0,75 = 101,2 → 100        (−%1,2)
  //   1 ms (1400–1500, 1800–2600 nm), 100 ns (>2600 nm): −%0,4
  // Bunlar standart değerlerdir; motor tabloyu birebir uygular.
  const KNOWN = [5e-6, 13e-6, 10, 1e-3, 1e-7];
  const wls = [180, 250, 302.2, 307, 315, 350, 400, 445, 470, 550, 650, 700, 850, 1050, 1150, 1200, 1250, 1320, 1399, 1400, 1490, 1500, 1800, 2600, 5000, 1e5, 1e6];
  for (const l of wls) {
    let prev = 0;
    let prevT = 0;
    for (let e = -13; e <= Math.log10(3e4); e += 0.01) {
      const t = Math.pow(10, e);
      const H = M.eyeMPE_H(l, t, {});
      assert.ok(H > 0 && Number.isFinite(H), l + ' nm, ' + t + ' s pozitif ve sonlu olmalı');
      if (H < prev * (1 - 1e-9)) {
        const bp = KNOWN.find((b) => prevT <= b * (1 + 1e-9) && t >= b * (1 - 1e-9));
        assert.ok(bp !== undefined && H >= prev * 0.95, l + ' nm: H(' + t + ') = ' + H + ' < önceki ' + prev + ' (bilinen basamak değil)');
      }
      prev = H;
      prevT = t;
    }
  }
});

test('deri MPE süreyle azalmaz ve pozitif', () => {
  for (const l of [200, 300, 355, 405, 532, 808, 1064, 1300, 1550, 10600]) {
    let prev = 0;
    let prevT = 0;
    for (let e = -13; e <= Math.log10(3e4); e += 0.01) {
      const t = Math.pow(10, e);
      const H = M.skinMPE_H(l, t, {});
      assert.ok(H > 0 && Number.isFinite(H));
      if (H < prev * (1 - 1e-9)) {
        // 100 ns: 200·C_A → 11·C_A·(100 ns)^0,25 = 195,6·C_A (−%2,2); IR 1 ms / 100 ns: −%0,4
        const bp = [1e-7, 1e-3].find((b) => prevT <= b * (1 + 1e-9) && t >= b * (1 - 1e-9));
        assert.ok(bp !== undefined && H >= prev * 0.97, l + ' nm deri: ' + t + ' s');
      }
      prev = H;
      prevT = t;
    }
  }
});

test('tablo kırılma noktalarında süreklilik (bilinen sıçramalar hariç)', () => {
  // [λ, t] ve izin verilen en büyük göreli sıçrama
  const pts = [
    [550, 5e-6, 0.06], [550, 10, 0.02], [800, 5e-6, 0.06], [1064, 13e-6, 0.03], [1064, 10, 0.02],
    [355, 10, 0.01], [1450, 1e-3, 0.01], [1450, 10, 0.01], [2000, 1e-3, 0.01], [3000, 1e-7, 0.01],
    [10600, 10, 0.01], [450, 100, 0.001],
  ];
  for (const [l, t, tol] of pts) {
    const a = M.eyeMPE_H(l, t * (1 - 1e-6), {});
    const b = M.eyeMPE_H(l, t * (1 + 1e-6), {});
    assert.ok(Math.abs(b / a - 1) <= tol, l + ' nm, ' + t + ' s: sıçrama ' + (b / a - 1));
  }
});

test('düzeltme faktörleri ve zaman parametreleri', () => {
  near(M.CA(699.9), 1, 1e-12);
  near(M.CA(1050), 5, 1e-12);
  near(M.CB(600), Math.pow(10, 3), 1e-12);
  near(M.CC(1150), 1, 1e-12);
  near(M.CC(1250), 9, 1e-12);
  near(M.T1(475), 10 * Math.pow(10, 0.5), 1e-12);
  assert.equal(M.T2(1), 10);
  assert.equal(M.T2(150), 100);
  assert.equal(M.Ti(532), 5e-6);
  assert.equal(M.Ti(1064), 13e-6);
  assert.equal(M.alphaMax(1e-4), 5);
  assert.equal(M.alphaMax(1), 100);
  assert.equal(M.CE(1, 1), 1);
  near(M.CE(50, 1), 50 / 1.5, 1e-12);
  near(M.CE(200, 1), (200 * 200) / (1.5 * 100), 1e-12, 'α > α_max: α²/(α_min·α_max)');
  near(M.CE(10, 1e-4), (10 * 10) / (1.5 * 5), 1e-12, 'kısa darbede α_max = 5 mrad');
});

test('ölçüm açıklıkları (ICNIRP Tablo 8)', () => {
  assert.equal(M.eyeApertureM(532, 0.25), 7e-3);
  assert.equal(M.eyeApertureM(355, 0.1), 1e-3);
  near(M.eyeApertureM(355, 1), 1.5e-3, 1e-12);
  assert.equal(M.eyeApertureM(1550, 100), 3.5e-3);
  assert.equal(M.eyeApertureM(3e5, 1), 11e-3);
  assert.equal(M.skinApertureM(532), 3.5e-3);
  assert.equal(M.skinApertureM(3e5), 11e-3);
});

test('alan dışı girişler reddedilir', () => {
  assert.ok(M.checkDomain(179, 1));
  assert.ok(M.checkDomain(532, 0));
  assert.ok(M.checkDomain(532, 4e4));
  assert.equal(M.checkDomain(532, 3e4), null);
});
