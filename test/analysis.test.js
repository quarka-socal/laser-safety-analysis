'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LE, near, gauss } = require('./helpers');
const A = LE.analysis;

const base532 = () => ({ limits: 'icnirp', lambda: 532, mode: 'cw', P: 1, T: 0.25, beam: gauss(1e-3, 1e-3) });

test('NOHD kapalı formla uyumlu (ANSI karesel, IEC TR doğrusal)', () => {
  const E = 18 * Math.pow(0.25, 0.75) / 0.25; // W/m²
  const Dn = Math.sqrt((4 * 1) / (Math.PI * E));
  const ansi = Math.sqrt(Dn * Dn - 1e-6) / 1e-3;
  const iec = (Dn - 1e-3) / 1e-3;
  near(A.analyze(base532()).eye.nohd, ansi, 1e-3, 'karesel model');
  near(A.analyze(Object.assign(base532(), { model: 'linear' })).eye.nohd, iec, 1e-3, 'doğrusal model');
});

test('OD gücün logaritmasıyla doğrusal: 10×P → OD + 1', () => {
  const a = A.analyze(Object.assign(base532(), { range: 50 }));
  const b = A.analyze(Object.assign(base532(), { range: 50, P: 10 }));
  near(b.eye.odAtRange - a.eye.odAtRange, 1, 1e-9);
  near(b.eye.odWorst - a.eye.odWorst, 1, 1e-9);
});

test('OD mesafeyle artmaz, NOHD güçle artar', () => {
  let prev = Infinity;
  for (const r of [0, 1, 3, 10, 30, 100, 300, 1000]) {
    const o = A.analyze(Object.assign(base532(), { range: r }));
    assert.ok(o.eye.odAtRange <= prev + 1e-12, 'r = ' + r);
    prev = o.eye.odAtRange;
  }
  let n = 0;
  for (const P of [1e-3, 1e-2, 0.1, 1, 10]) {
    const o = A.analyze(Object.assign(base532(), { P }));
    assert.ok(o.eye.nohd >= n);
    n = o.eye.nohd;
  }
});

test('NOHD noktasında OD ≈ 0, hemen öncesinde > 0', () => {
  const o = A.analyze(base532());
  const r = o.eye.nohd;
  const at = A.analyze(Object.assign(base532(), { range: r * 1.0001 }));
  const before = A.analyze(Object.assign(base532(), { range: r * 0.99 }));
  assert.equal(at.eye.odAtRange, 0);
  assert.ok(before.eye.odAtRange > 0);
});

test('atmosferik zayıflama NOHD\'yi kısaltır; sıfır ıraksama sonsuz NOHD', () => {
  const a = A.analyze(base532());
  const b = A.analyze(Object.assign(base532(), { mu: 1e-3 }));
  assert.ok(b.eye.nohd < a.eye.nohd);
  const c = A.analyze(Object.assign(base532(), { beam: gauss(1e-3, 0) }));
  assert.equal(c.eye.nohdInf, true);
  const d = A.analyze(Object.assign(base532(), { beam: gauss(1e-3, 0), mu: 1e-3 }));
  assert.equal(d.eye.nohdInf, false);
  assert.ok(d.eye.nohd > 0 && Number.isFinite(d.eye.nohd));
});

test('optik destekli bakış (dürbün): 302,5–4000 nm, uzak alanda kazanç τ·M²', () => {
  const inp = Object.assign(base532(), { oav: { on: true } });
  const o = A.analyze(inp);
  assert.ok(o.eye.enohd > o.eye.nohd);
  // 50 mm objektif, M = 50/7, τ = 0,9: uzak alanda kazanç ≈ 0,9·(50/7)²
  near(o.eye.enohd / o.eye.nohd, Math.sqrt(0.9 * Math.pow(50 / 7, 2)), 0.03);
  // UV (355 nm) ve IR (2 µm): kornea açıklığıyla da aynı uzak alan kazancı, τ = 0,7
  for (const l of [355, 2000]) {
    const u = A.analyze({ limits: 'icnirp', lambda: l, mode: 'cw', P: 1, T: l < 400 ? 3e4 : 10, beam: gauss(1e-3, 1e-3), oav: { on: true } });
    assert.equal(u.eye.oav.on, true, l + ' nm');
    near(u.eye.enohd / u.eye.nohd, Math.sqrt(0.7 * Math.pow(50 / 7, 2)), 0.02, l + ' nm ENOHD/NOHD');
  }
  // 302,5 nm altı ve 4 µm üstü: cam optik geçirmez
  for (const l of [250, 10600]) {
    const ir = A.analyze({ lambda: l, mode: 'cw', P: 10, T: 10, beam: gauss(5e-3, 2e-3), oav: { on: true } });
    assert.equal(ir.eye.enohd, null, l + ' nm');
    assert.equal(ir.eye.oav.notApplicable, true);
    assert.ok(ir.warnings.some((w) => w.indexOf('Dürbünle bakış') >= 0));
  }
});

test('dürbün kornea modeli: küçük ışın göze daraltılarak taşınır (IEC Koşul 1, 7 mm)', () => {
  // 355 nm, 0,1 s (1 mm açıklık, küçük ışın kuralı), 3 mm ışın: 7×50 dürbün ışını 0,42 mm'ye daraltır
  const inp = { limits: 'icnirp', lambda: 355, mode: 'cw', P: 10, T: 0.1, beam: gauss(3e-3, 0.5e-3), range: 0 };
  const a = A.analyze(inp);
  const b = A.analyze(Object.assign({}, inp, { oav: { on: true } }));
  const dOD = b.eye.odAtRange - a.eye.odAtRange;
  assert.ok(dOD > 1.4 && dOD < 1.7, 'OD artışı ' + dOD);
  assert.equal(b.eye.atRange.viaOptics, true);
  // etkin giriş açıklığı: retina 50 mm, kornea 1 mm → 50/7 mm
  const sec = { profile: 'gauss', dx: 1, dy: 1 }; // 1 m ışın: geçen oran = 1 − exp(−(D_eff/d)²)
  const oav = { D: 0.05, tau: 1 };
  near(A.oavFactor(sec, oav, 7e-3, false) * (Math.PI * 49e-6 / 4), 1 - Math.exp(-Math.pow(0.05, 2)), 1e-9, 'retina D_eff = 50 mm');
  near(A.oavFactor(sec, oav, 1e-3, false) * (Math.PI * 1e-6 / 4), 1 - Math.exp(-Math.pow(0.05 / 7, 2)), 1e-9, 'kornea D_eff = 7,14 mm');
});

test('Kural 3 (ICNIRP 2013 C_P) durumları', () => {
  // τ ≤ Tᵢ, T > 0,25 s, N > 600 → C_P = 5·n^−0,25
  const q = A.analyze({ limits: 'icnirp', lambda: 1064, mode: 'rp', Q: 1e-3, tau: 10e-9, f: 1000, T: 10, beam: gauss(2e-3, 1e-3) });
  near(q.eye.info.cp.Cp, 0.5, 1e-9);
  assert.equal(q.eye.summary.governing.rule, 'K3');
  near(q.eye.summary.governing.perPulseH, 0.5 * 2e-2, 1e-9);
  // T ≤ 0,25 s → C_P = 1
  const q2 = A.analyze({ limits: 'icnirp', lambda: 1064, mode: 'rp', Q: 1e-3, tau: 10e-9, f: 1000, T: 0.25, beam: gauss(2e-3, 1e-3) });
  assert.equal(q2.eye.info.cp.Cp, 1);
  // τ > Tᵢ, genişletilmiş kaynak
  const ext = (alpha) => A.analyze({ limits: 'icnirp', lambda: 532, mode: 'rp', Q: 1e-6, tau: 1e-3, f: 10, T: 10, alpha, beam: gauss(2e-3, 1e-3) }).eye.info.cp;
  assert.equal(ext(4).Cp, 1, 'α ≤ 5 mrad');
  near(ext(6).Cp, 0.4, 1e-12, '5 < α ≤ α_max, n > 40');
  near(ext(50).Cp, Math.pow(100, -0.25), 1e-9, 'α_max < α < 100, n ≤ 625');
  assert.equal(ext(150).Cp, 1, 'α ≥ 100 mrad');
});

test('Tᵢ içindeki darbeler tek darbe sayılır', () => {
  const o = A.analyze({ limits: 'icnirp', lambda: 800, mode: 'rp', Q: 1e-9, tau: 100e-15, f: 1e6, T: 10, beam: gauss(2e-3, 1e-3) });
  assert.equal(o.eye.info.nTi, 5);
  assert.ok(o.eye.criteria.some((c) => c.rule === 'K1' && c.k === 5));
});

test('darbe sayımı ve alt grup adayları', () => {
  assert.equal(A.pulsesIn(0.25, 10, 4e-9), 3, '10 Hz, 0,25 s → 3 darbe (EasyHaz ile aynı)');
  assert.equal(A.pulsesIn(10, 1000, 1e-8), 10000);
  assert.deepEqual(A.candidateKs(2), []);
  const ks = A.candidateKs(1e6);
  assert.ok(ks.length < 120 && ks[0] === 2 && ks[ks.length - 1] < 1e6);
});

test('yaygın yansıma nokta kaynak formülü: r = √(ρ·P·cosθ / (π·MPE))', () => {
  const o = A.analyze({ limits: 'icnirp', lambda: 10600, mode: 'cw', P: 2000, T: 10, beam: gauss(10e-3, 1e-3), diffuse: { rho: 0.5, thetaDeg: 60, r: 0.5, T: 10 } });
  near(o.diffuse.eye.nhz, Math.sqrt((0.5 * 2000 * 0.5) / (Math.PI * 1000)), 1e-6);
});

test('genişletilmiş kaynak yaygın yansımada NHZ\'yi küçültür (C_E)', () => {
  const inp = (ext) => ({ lambda: 532, mode: 'cw', P: 5, T: 0.25, beam: gauss(2e-3, 1e-3), diffuse: { rho: 1, r: 0.2, T: 600, extended: ext, spotD: 10e-3 } });
  const p = A.analyze(inp(false));
  const e = A.analyze(inp(true));
  assert.ok(e.diffuse.eye.nhz < p.diffuse.eye.nhz);
});

test('mercek (lens-on-laser) NHZ ≈ (f/b)·√(4Φ/(π·MPE))', () => {
  const o = A.analyze({ limits: 'icnirp', lambda: 1064, mode: 'cw', P: 10, T: 10, beam: gauss(5e-3, 1e-3), lens: { f: 0.1, b: 5e-3, range: 1 } });
  const E = 50; // W/m², 1064 nm, 10 s
  near(o.lens.nohd, (0.1 / 5e-3) * Math.sqrt((4 * 10) / (Math.PI * E)), 2e-3);
});

test('fiber: çok modlu NOHD = (1,7/NA)·√(Φ/(π·MPE))', () => {
  const o = A.analyze({ limits: 'icnirp', lambda: 1550, mode: 'cw', P: 1, T: 10, beam: gauss(1e-3, 1e-3), fiber: { type: 'multi', NA: 0.2 } });
  // kapalı form tepe ışınımını kullanır; motor 3,5 mm açıklık ortalaması alır (≈%0,3 kısa)
  near(o.fiber.nohd, (1.7 / 0.2) * Math.sqrt(1 / (Math.PI * 1000)), 1e-2);
  assert.ok(o.fiber.nohd <= (1.7 / 0.2) * Math.sqrt(1 / (Math.PI * 1000)));
});

test('geçersiz girişler hata verir, hesap yapılmaz', () => {
  const bad = [
    { lambda: 150, mode: 'cw', P: 1, T: 1, beam: gauss(1e-3, 1e-3) },
    { lambda: 532, mode: 'cw', P: 0, T: 1, beam: gauss(1e-3, 1e-3) },
    { lambda: 532, mode: 'cw', P: 1, T: 5e4, beam: gauss(1e-3, 1e-3) },
    { lambda: 532, mode: 'rp', Q: 1e-3, tau: 1e-3, f: 2000, T: 1, beam: gauss(1e-3, 1e-3) },
    { lambda: 532, mode: 'rp', tau: 1e-9, f: 10, T: 1, beam: gauss(1e-3, 1e-3) },
    { lambda: 532, mode: 'sp', Q: 1e-3, tau: 0, beam: gauss(1e-3, 1e-3) },
    { lambda: 532, mode: 'cw', P: 1, T: 1, beam: gauss(-1e-3, 1e-3) },
  ];
  for (const b of bad) {
    const o = A.analyze(b);
    assert.equal(o.ok, false, JSON.stringify(b));
    assert.ok(o.errors.length > 0);
    assert.equal(o.eye, undefined);
  }
});

test('tekrarlı darbe girişi: enerji, ortalama güç veya tepe güç eşdeğer', () => {
  const b = { lambda: 532, mode: 'rp', tau: 5e-9, f: 100, T: 0.25, beam: gauss(2e-3, 1e-3) };
  const a1 = A.analyze(Object.assign({ Q: 1e-3 }, b));
  const a2 = A.analyze(Object.assign({ P: 0.1 }, b));
  const a3 = A.analyze(Object.assign({ Ppeak: 2e5 }, b));
  near(a2.eye.odWorst, a1.eye.odWorst, 1e-12);
  near(a3.eye.odWorst, a1.eye.odWorst, 1e-12);
});

test('her analiz sonucu sonlu ve tutarlı (rastgele 300 giriş)', () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const lu = (a, b) => Math.pow(10, Math.log10(a) + rnd() * (Math.log10(b) - Math.log10(a)));
  const wls = [193, 266, 355, 405, 450, 532, 633, 808, 1064, 1319, 1550, 2940, 10600];
  for (let i = 0; i < 300; i++) {
    const l = wls[Math.floor(rnd() * wls.length)];
    const mode = ['cw', 'sp', 'rp'][Math.floor(rnd() * 3)];
    const inp = { lambda: l, mode, T: lu(0.25, 3e4), beam: gauss(lu(1e-4, 3e-2), lu(1e-5, 1e-1)), range: lu(0.1, 1e4), diffuse: { rho: 1, r: 0.5 } };
    if (mode === 'cw') inp.P = lu(1e-5, 1e4);
    else {
      inp.Q = lu(1e-9, 10);
      inp.tau = lu(1e-14, 1e-2);
      if (mode === 'rp') { inp.f = Math.min(lu(1, 1e9), 0.5 / inp.tau); inp.T = Math.max(inp.T, inp.tau); }
    }
    const o = A.analyze(inp);
    assert.equal(o.ok, true, JSON.stringify(inp) + ' ' + o.errors);
    for (const v of [o.eye.odWorst, o.eye.odAtRange, o.eye.at0.od, o.skin.timesMPE, o.diffuse.eye.nhz]) {
      assert.ok(Number.isFinite(v) && v >= 0, JSON.stringify(inp));
    }
    assert.ok(o.eye.odWorst + 1e-9 >= o.eye.at0.od, 'en kötü OD ≥ çıkıştaki OD');
    assert.ok(o.eye.at0.od + 1e-9 >= o.eye.odAtRange, 'çıkıştaki OD ≥ mesafedeki OD');
    assert.ok(o.eye.nohd >= 0);
  }
});
