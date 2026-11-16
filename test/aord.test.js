'use strict';
/*
 * 2006/25/AT Ek II maruziyet sınır değerleri (MSD) testleri.
 * Beklenen değerler direktifin Tablo 2.2–2.6'sından elle hesaplanmıştır.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { LE, near, gauss } = require('./helpers');
const AB = LE.aord;
const A = LE.analysis;
const H = (l, t, a) => AB.eyeMSD_H(l, t, { alpha: a || 0 });

test('Tablo 2.2 — göz, t < 10 s', () => {
  near(H(193, 1e-12), 3e10 * 1e-12, 1e-12, 'UV 1 ns altı E = 3·10¹⁰ W/m²');
  near(H(250, 1e-6), 30, 1e-12);
  near(H(302.5, 1), 30, 1e-12, '302–303 nm muhafazakâr olarak 30');
  near(H(303.5, 1), 40, 1e-12, 'ara dalga boyunda alttaki satır');
  near(H(303, 1e-9), Math.min(40, 5.6e3 * Math.pow(1e-9, 0.25)), 1e-12, 't < 2,6 ns termal');
  near(H(314.9, 1), 5600, 1e-12, '314 nm satırı: t < 1,6 s termal');
  near(H(355, 1e-8), 56, 1e-9);
  near(H(532, 1e-12), 1.5e-4, 1e-12);
  near(H(532, 1e-10), 2.7e4 * Math.pow(1e-10, 0.75), 1e-12);
  near(H(532, 1e-6), 5e-3, 1e-12);
  near(H(532, 1.8e-5), 18 * Math.pow(1.8e-5, 0.75), 1e-12);
  near(H(800, 1e-12), 1.5e-4 * AB.CA(800), 1e-12, '700–1050 nm alt ns satırında C_A var');
  near(H(1064, 1e-12), 1.5e-3, 1e-12);
  near(H(1064, 1e-10), 2.7e5 * Math.pow(1e-10, 0.75), 1e-12);
  near(H(1064, 4.9e-5), 5e-2, 1e-12);
  near(H(1300, 1e-6), 5e-2 * 8, 1e-12, 'C_C = 8 (1200–1400 nm)');
  near(H(1450, 1e-12), 1e12 * 1e-12, 1e-12);
  near(H(1600, 1e-12), 1e13 * 1e-12, 1e-12);
  near(H(3000, 1e-12), 1e11 * 1e-12, 1e-12);
  near(H(3000, 5e-8), 100, 1e-12);
});

test('Tablo 2.3 — göz, t ≥ 10 s', () => {
  near(H(250, 1000), 30, 1e-12);
  near(H(310.2, 100), 1000, 1e-12);
  near(H(355, 3e4), 1e4, 1e-12, 'UVA 10⁴ J/m² (30 ks dahil)');
  near(H(450, 1000), 1000, 1e-12, 'fotokimyasal 1·C_B W/m²');
  near(H(480, 50), 100 * AB.CB(480), 1e-12);
  near(H(633, 100), 1000, 1e-12, 'termal 10 W/m²');
  near(H(1064, 100), 50 * 100, 1e-12);
  near(H(1319, 100), 10 * 5 * 8 * 100, 1e-12);
  near(H(1550, 100), 1e5, 1e-12);
  // genişletilmiş kaynak, t > T₂, IR-A: en çok 1000 W/m²
  near(H(1300, 1000, 100), 1000 * 1000, 1e-12);
  // görünürde 1000 W/m² sınırı yok (650 nm: fotokimyasal sınır da yok)
  const t2 = AB.T2(50);
  near(H(650, 1000, 50), 18 * (50 / 1.5) * Math.pow(t2, -0.25) * 1000, 1e-12);
  // 550 nm'de aynı koşulda fotokimyasal sınır (1·C_B W/m²) daha düşüktür
  near(H(550, 1000, 50), AB.CB(550) * 1000, 1e-12);
});

test('Tablo 2.4 — deri', () => {
  const S = (l, t) => AB.skinMSD_H(l, t);
  near(S(355, 1e-12), 3e10 * 1e-12, 1e-12);
  near(S(355, 1), 5600, 1e-12, 'UV: göz ile aynı');
  near(S(532, 1e-12), 2e11 * 1e-12, 1e-12);
  near(S(800, 1e-12), 2e11 * AB.CA(800) * 1e-12, 1e-12);
  near(S(532, 5e-8), 200, 1e-12);
  near(S(1064, 1), 1.1e4 * 5, 1e-12);
  near(S(532, 100), 2e3 * 100, 1e-12);
  near(S(1550, 1e-12), 1e13 * 1e-12, 1e-12);
  near(S(10600, 100), 1e5, 1e-12);
  assert.equal(AB.skinApertureM(3e5), 3.5e-3, 'deri açıklığı tüm dalga boylarında 3,5 mm');
});

test('Tablo 2.5 ve 2.6 — faktörler, T_min, açıklıklar', () => {
  near(AB.CC(1175), Math.pow(10, 0.45), 1e-12);
  assert.equal(AB.CC(1300), 8);
  near(AB.CB(650), Math.pow(10, 4), 1e-12, 'C_B 450–700 nm tanımlı');
  assert.equal(AB.CE(1), 1);
  near(AB.CE(50), 50 / 1.5, 1e-12);
  near(AB.CE(200), (200 * 200) / 150, 1e-12, 'α_max = 100 mrad sabit');
  near(AB.T2(50), 10 * Math.pow(10, 48.5 / 98.5), 1e-12);
  assert.ok(Number.isNaN(AB.Tmin(300)));
  assert.equal(AB.Tmin(355), 1e-9);
  assert.equal(AB.Tmin(532), 18e-6);
  assert.equal(AB.Tmin(1064), 50e-6);
  assert.equal(AB.Tmin(1450), 1e-3);
  assert.equal(AB.Tmin(1550), 10);
  assert.equal(AB.Tmin(2000), 1e-3);
  assert.equal(AB.Tmin(10600), 1e-7);
  near(AB.eyeApertureM(355, 0.32), 1.5e-3 * Math.pow(0.32, 0.375), 1e-12, 'UV: 0,3 s sonrası 1,5·t^0,375');
  assert.equal(AB.eyeApertureM(355, 10), 3.5e-3);
  assert.equal(AB.eyeApertureM(1550, 0.3), 1e-3);
});

test('MSD süreyle azalmaz — yalnız tablo yuvarlama basamakları hariç', () => {
  const KNOWN = [1.8e-5, 5e-5, 10, 1e-3, 1e-7, 1e-9];
  for (const l of [180, 250, 303.4, 308, 314.5, 330, 405, 450, 470, 532, 650, 800, 1064, 1180, 1319, 1450, 1550, 2000, 3000, 10600, 5e5]) {
    let prev = 0;
    let prevT = 0;
    for (let e = -13; e <= Math.log10(3e4); e += 0.01) {
      const t = Math.pow(10, e);
      const h = H(l, t);
      assert.ok(h > 0 && Number.isFinite(h));
      if (h < prev * (1 - 1e-9)) {
        const bp = KNOWN.find((b) => prevT <= b * (1 + 1e-9) && t >= b * (1 - 1e-9));
        assert.ok(bp !== undefined && h >= prev * 0.95, l + ' nm: H(' + t + ') = ' + h + ' < ' + prev);
      }
      prev = h;
      prevT = t;
    }
  }
});

test('Kural 3: tüm termal sınırlara C_P = N^−0,25, N = T içindeki darbe sayısı', () => {
  const o = A.analyze({ limits: 'aord', lambda: 1064, mode: 'rp', Q: 0.5, tau: 1e-8, f: 10, T: 10, beam: gauss(2e-3, 1e-3) });
  near(o.eye.infoBySet.AB.cp.Cp, Math.pow(100, -0.25), 1e-12);
  assert.equal(o.eye.summary.governing.rule, 'K3');
  near(o.eye.summary.governing.perPulseH, 5e-2 * Math.pow(100, -0.25), 1e-12);
  // IR kornea (termal) için de uygulanır
  const ir = A.analyze({ limits: 'aord', lambda: 10600, mode: 'rp', Q: 1e-3, tau: 1e-4, f: 1, T: 10, beam: gauss(5e-3, 2e-3) });
  assert.ok(ir.eye.criteria.some((c) => c.rule === 'K3' && c.mech === 'kornea-IR'));
  // 315 nm ve altında T_min tanımsız: Kural 3 yok
  const uv = A.analyze({ limits: 'aord', lambda: 308, mode: 'rp', Q: 1e-3, tau: 2e-8, f: 100, T: 100, beam: gauss(5e-3, 2e-3) });
  assert.ok(!uv.eye.criteria.some((c) => c.rule === 'K3'));
  // T_min içindeki darbeler gruplanır (532 nm, 1 MHz, T_min = 18 µs → 18 darbe)
  const ml = A.analyze({ limits: 'aord', lambda: 532, mode: 'rp', Q: 1e-9, tau: 1e-12, f: 1e6, T: 0.25, beam: gauss(2e-3, 1e-3) });
  assert.equal(ml.eye.infoBySet.AB.nTi, 18);
});

test('varsayılan mod iki setin en koruyucusudur (rastgele 200 giriş)', () => {
  let seed = 777;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const lu = (a, b) => Math.pow(10, Math.log10(a) + rnd() * (Math.log10(b) - Math.log10(a)));
  const wls = [266, 308, 355, 405, 450, 532, 633, 808, 1064, 1180, 1319, 1550, 2940, 10600];
  for (let i = 0; i < 200; i++) {
    const l = wls[Math.floor(rnd() * wls.length)];
    const mode = ['cw', 'sp', 'rp'][Math.floor(rnd() * 3)];
    const inp = { lambda: l, mode, T: lu(0.25, 3e4), beam: gauss(lu(3e-4, 2e-2), lu(1e-4, 1e-2)), range: lu(0.1, 1e3), diffuse: { rho: 1, r: 0.5 } };
    if (mode === 'cw') inp.P = lu(1e-4, 1e3);
    else {
      inp.Q = lu(1e-8, 1);
      inp.tau = lu(1e-13, 1e-3);
      if (mode === 'rp') { inp.f = Math.min(lu(1, 1e8), 0.5 / inp.tau); inp.T = Math.max(inp.T, inp.tau); }
    }
    const r = {};
    for (const lim of ['icnirp', 'aord', 'both']) r[lim] = A.analyze(Object.assign({}, inp, { limits: lim }));
    const ctx = JSON.stringify(inp);
    assert.ok(r.both.ok && r.icnirp.ok && r.aord.ok, ctx);
    near(r.both.eye.odWorst + 1, Math.max(r.icnirp.eye.odWorst, r.aord.eye.odWorst) + 1, 1e-9, 'en kötü OD ' + ctx);
    near(r.both.eye.odAtRange + 1, Math.max(r.icnirp.eye.odAtRange, r.aord.eye.odAtRange) + 1, 1e-9, 'mesafede OD ' + ctx);
    assert.ok(r.both.eye.nohd >= Math.max(r.icnirp.eye.nohd, r.aord.eye.nohd) * (1 - 1e-6), 'NOHD ' + ctx);
    assert.ok(r.both.diffuse.eye.nhz >= Math.max(r.icnirp.diffuse.eye.nhz, r.aord.diffuse.eye.nhz) * (1 - 1e-6), 'NHZ ' + ctx);
    assert.ok(r.both.skin.timesMPE >= Math.max(r.icnirp.skin.timesMPE, r.aord.skin.timesMPE) * (1 - 1e-9), 'deri ' + ctx);
  }
});

test('EasyHaz 2010 örnek dosyaları (ANSI 2007 ≈ 2006/25/AT) ile aynı sonuçlar', () => {
  const data = require(path.join(__dirname, 'data', 'easyhaz2010_examples.json'));
  let n = 0;
  for (const { c, eh } of data.cases) {
    const k = c.spec === '1/e2' ? Math.SQRT2 : 1;
    const d = (c.d_mm * 1e-3) / k;
    const phi = (c.div_mrad * 1e-3) / k;
    const inp = {
      limits: 'aord', lambda: c.wl, mode: c.mode, beam: gauss(d, phi), range: 0,
      diffuse: { rho: c.rho, thetaDeg: c.theta, r: c.dr_r, T: c.dr_T },
    };
    if (c.mode === 'cw') Object.assign(inp, { P: c.value, T: c.T });
    if (c.mode === 'sp') Object.assign(inp, { Q: c.value, tau: c.tau });
    if (c.mode === 'rp') Object.assign(inp, { tau: c.tau, f: c.f, T: c.T }, c.kind === 'P' ? { P: c.value } : { Q: c.value });
    if (c.lens_f_mm > 0) inp.lens = { f: c.lens_f_mm * 1e-3, b: (c.lens_b_mm * 1e-3) / k, range: 0 };
    if (c.fiber_NA) inp.fiber = { type: 'multi', NA: c.fiber_NA, range: 0 };
    const o = A.analyze(inp);
    assert.equal(o.ok, true, c.dosya);
    const g = o.eye.summary.governing;
    const mpe = c.mode === 'cw' ? (g.perPulseH / c.T) * 1e-4 : c.mode === 'sp' ? g.perPulseH * 1e-4 : g.perPulseH * c.f * 1e-4;
    // UV (315–400 nm): direktif Tablo 2.6 T_min verdiği için Kural 3 uygulanır; ANSI 2007 uygulamaz → daha koruyucu
    const uvRule3 = c.wl > 315 && c.wl <= 400 && c.mode === 'rp';
    if (uvRule3) {
      assert.ok(mpe <= eh.mpe_ansi, c.dosya + ' MSD');
      assert.ok(o.eye.odWorst >= eh.od_worst, c.dosya + ' OD');
      assert.ok(o.eye.nohd >= eh.nohd, c.dosya + ' NOHD');
      continue;
    }
    near(mpe, eh.mpe_ansi, 2e-3, c.dosya + ' MSD');
    assert.ok(Math.abs(o.eye.odAtRange - eh.od_rng) <= 0.006, c.dosya + ' OD@0: ' + o.eye.odAtRange + ' / ' + eh.od_rng);
    assert.ok(Math.abs(o.eye.odWorst - eh.od_worst) <= 0.006, c.dosya + ' en kötü OD');
    near(o.eye.nohd, eh.nohd, 2e-3, c.dosya + ' NOHD');
    if (eh.dr_nhz > 0) near(o.diffuse.eye.nhz, eh.dr_nhz, 0.02, c.dosya + ' yaygın NHZ (3 basamağa yuvarlanmış)');
    if (eh.dr_od !== undefined) assert.ok(Math.abs(LE.analysis.od(o.diffuse.eye.ratioAtR) - eh.dr_od) <= 0.006, c.dosya + ' yaygın OD');
    if (eh.fo_nohd > 0) near(o.fiber.nohd, eh.fo_nohd, 3e-3, c.dosya + ' fiber NOHD');
    if (eh.lol_nohd > 0) near(o.lens.nohd, eh.lol_nohd, 1e-2, c.dosya + ' mercek NHZ');
    n++;
  }
  assert.ok(n >= 10, 'karşılaştırılan vaka: ' + n);
});
