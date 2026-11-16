/*
 * Lazer Emniyet — gömülü öz-denetim
 *
 * Program her açılışta bu vektörleri çalıştırır. Beklenen değerler ICNIRP 2013
 * tablolarından elle hesaplanmış ya da yayımlanmış örneklerden alınmıştır;
 * hesap motorunun kendi fonksiyonlarıyla üretilmemiştir.
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  function g(dm, phi) {
    return { profile: 'gauss', dx: dm, dy: dm, phix: phi, phiy: phi };
  }
  const S2 = Math.SQRT2;
  const eyeH = (l, t, a) => LE.mpe.eyeMPE_H(l, t, { alpha: a || 0 });
  const skinH = (l, t) => LE.mpe.skinMPE_H(l, t, {});
  const abH = (l, t) => LE.aord.eyeMSD_H(l, t, {});

  const VECTORS = [
    // --- Göz MPE, ICNIRP 2013 Tablo 5 (J/m²)
    ['MPE 532 nm, 1 ns', () => eyeH(532, 1e-9), 2.0e-3],
    ['MPE 532 nm, 0,25 s', () => eyeH(532, 0.25), 6.36396],
    ['MPE 532 nm, 10 s (nokta)', () => eyeH(532, 10), 100],
    ['MPE 450 nm, 1000 s (fotokimyasal)', () => eyeH(450, 1000), 1000],
    ['MPE 480 nm, 50 s (fotokimyasal)', () => eyeH(480, 50), 398.107],
    ['MPE 633 nm, 100 fs', () => eyeH(633, 1e-13), 1.0e-3],
    ['MPE 800 nm, 1 ns', () => eyeH(800, 1e-9), 3.16979e-3],
    ['MPE 905 nm, 100 ns', () => eyeH(905, 1e-7), 5.14079e-3],
    ['MPE 1064 nm, 10 ns', () => eyeH(1064, 1e-8), 2.0e-2],
    ['MPE 1064 nm, 1 ms', () => eyeH(1064, 1e-3), 0.506107],
    ['MPE 1064 nm, 100 s', () => eyeH(1064, 100), 5000],
    ['MPE 1300 nm, 1 µs', () => eyeH(1300, 1e-6), 2.16],
    ['MPE 1319 nm, 1 s (ANSI kornea/lens)', () => eyeH(1319, 1), 23969.5],
    ['MPE 1390 nm, 100 µs (ANSI kornea/lens)', () => eyeH(1390, 1e-4), 3776.76],
    ['MPE 1550 nm, 1 ns', () => eyeH(1550, 1e-9), 1e4],
    ['MPE 1550 nm, 100 s', () => eyeH(1550, 100), 1e5],
    ['MPE 10,6 µm, 10 ns', () => eyeH(10600, 1e-8), 100],
    ['MPE 10,6 µm, 1 ms', () => eyeH(10600, 1e-3), 995.837],
    ['MPE 10,6 µm, 10 s', () => eyeH(10600, 10), 1e4],
    ['MPE 248 nm, 1 s', () => eyeH(248, 1), 30],
    ['MPE 308 nm, 1 s (C₂)', () => eyeH(308, 1), 398.107],
    ['MPE 314,5 nm, 1 s (termal sınır)', () => eyeH(314.5, 1), 5600],
    ['MPE 314,5 nm, 100 s (ICNIRP basamağı)', () => eyeH(314.5, 100), 6300],
    ['MPE 355 nm, 10 ns', () => eyeH(355, 1e-8), 56.0],
    ['MPE 355 nm, 100 s', () => eyeH(355, 100), 1e4],
    ['MPE 193 nm, 1 ps (1 ns altı)', () => eyeH(193, 1e-12), 0.03],
    ['MPE 532 nm, 1 s, α = 10 mrad', () => eyeH(532, 1, 10), 120],
    // --- Deri MPE, Tablo 7
    ['Deri 532 nm, 50 ns', () => skinH(532, 5e-8), 200],
    ['Deri 532 nm, 1 s', () => skinH(532, 1), 1.1e4],
    ['Deri 532 nm, 100 s', () => skinH(532, 100), 2e5],
    ['Deri 1064 nm, 1 s', () => skinH(1064, 1), 5.5e4],
    // --- Faktörler ve açıklıklar
    ['C_A(750 nm)', () => LE.mpe.CA(750), 1.258925],
    ['C_B(500 nm)', () => LE.mpe.CB(500), 10],
    ['C_C(1175 nm)', () => LE.mpe.CC(1175), 2.818383],
    ['T₂(50 mrad)', () => LE.mpe.T2(50), 31.0732],
    ['α_max(1 ms)', () => LE.mpe.alphaMax(1e-3), 6.32456],
    ['Açıklık 10,6 µm, 1 s', () => LE.mpe.eyeApertureM(10600, 1) * 1e3, 1.5],
    ['Açıklık 10,6 µm, 10 s', () => LE.mpe.eyeApertureM(10600, 10) * 1e3, 3.5],
    // --- Tam analiz örnekleri (EasyHaz LSO 2014 örnek dosyaları ile aynı sonuç)
    ['CO₂ 2 kW: NOHD (m)', () => run(co2()).eye.nohd, 1504.46, 1e-3],
    ['CO₂ 2 kW: en kötü OD', () => run(co2()).eye.odWorst, 5.3178, 1e-3],
    ['CO₂ 2 kW: çıkışta OD', () => run(co2()).eye.at0.od, 4.1801, 1e-3],
    ['CO₂ 2 kW: yaygın NHZ (m)', () => run(co2()).diffuse.eye.nhz, 0.797885, 1e-3],
    ['Nd:YAG 532 nm 10 Hz: en kötü OD', () => run(yag()).eye.odWorst, 6.7421, 1e-3],
    ['Nd:YAG 532 nm 10 Hz: 100 m\'de OD', () => run(yag()).eye.odAtRange, 5.1681, 1e-3],
    // --- 2006/25/AT Ek II (Tablo 2.2–2.6), elle hesaplanmış
    ['MSD 2006/25/AT 532 nm, 1 ns', () => abH(532, 1e-9), 5e-3],
    ['MSD 2006/25/AT 800 nm, 1 ns', () => abH(800, 1e-9), 7.92447e-3],
    ['MSD 2006/25/AT 1064 nm, 100 µs', () => abH(1064, 1e-4), 0.09],
    ['MSD 2006/25/AT 1319 nm, 10 s (C_C = 8)', () => abH(1319, 10), 4000],
    ['MSD 2006/25/AT 303,5 nm, 1 s (303 nm satırı)', () => abH(303.5, 1), 40],
    ['MSD 2006/25/AT 532 nm, 100 µs, α = 10 mrad', () => LE.aord.eyeMSD_H(532, 1e-4, { alpha: 10 }), 0.12],
    ['MSD 2006/25/AT deri 1064 nm, 1 s', () => LE.aord.skinMSD_H(1064, 1), 5.5e4],
    // --- EasyHaz 2010 (ANSI 2007) örnek dosyalarıyla aynı sonuç
    ['Surelite III 532 nm 10 Hz (2006/25/AT): NOHD (m)', () => run(sur2010()).eye.nohd, 28129.9, 1e-3],
    ['Surelite III 532 nm 10 Hz (2006/25/AT): OD', () => run(sur2010()).eye.odWorst, 6.4634, 1e-3],
    ['Nd:YAG 1064 nm 10 Hz (2006/25/AT): darbe başına MSD', () => run(pp3()).eye.summary.governing.perPulseH, 1.58114e-2, 1e-4],
    ['Varsayılan mod: iki setin en koruyucusu (OD)', () => run(Object.assign(pp3(), { limits: 'both' })).eye.odWorst, 5.9150, 1e-3],
    // --- Dürbünle bakış (302,5–4000 nm): uzak alanda ENOHD/NOHD = √(τ·(D/7 mm)²)
    ['Dürbün 355 nm UV: ENOHD/NOHD', () => { const o = run({ limits: 'icnirp', lambda: 355, mode: 'cw', P: 1, T: 3e4, beam: g(1e-3, 1e-3), oav: { on: true } }); return o.eye.enohd / o.eye.nohd; }, 5.97614, 2e-2],
    // --- Atmosferik türbülans (sintilasyon) payı: ışınım ×10 (+1 OD)
    ['Türbülans payı: CO₂ NOHD oranı ≈ √10', () => run(Object.assign(co2(), { scint: { on: true, factor: 10 } })).eye.scint.nohd / 1504.46, Math.sqrt(10), 2e-3],
    ['Türbülans payı: önerilen OD (+1)', () => run(Object.assign(co2(), { scint: { on: true, factor: 10 } })).eye.scint.recOD, 7, 'exact'],
    ['Türbülans payı: EN 207 (+1 LB)', () => run(Object.assign(lasermet(), { scint: { on: true, factor: 10 } })).eyewear.markingScint, 'D 532 LB7 + R 532 LB8'],
    // --- EN 207 / EN 208 yayımlanmış örnekler
    ['EN 207 (Lasermet örneği) 532 nm 10 kHz', () => run(lasermet()).eyewear.marking, 'D 532 LB6 + R 532 LB7'],
    ['EN 207 1064 nm 10 W 4 mm', () => run({ lambda: 1064, mode: 'cw', P: 10, T: 10, beam: g(4e-3, 1e-3) }).eyewear.marking, 'D 1064 LB5'],
    ['EN 207 800 nm 200 fs 200 kHz', () => run({ lambda: 800, mode: 'rp', Q: 4.5e-6, tau: 200e-15, f: 2e5, T: 10, beam: g(3e-3, 1e-3) }).eyewear.marking, 'D 800 LB5 + M 800 LB6'],
    ['EN 207 632 nm 10 mW 5 mm', () => run({ lambda: 632, mode: 'cw', P: 0.01, T: 0.25, beam: g(5e-3, 1e-3) }).eyewear.marking, 'D 632 LB2'],
    ['EN 208 532 nm 5 W → RB', () => run({ lambda: 532, mode: 'cw', P: 5, T: 0.25, beam: g(2e-3, 1e-3) }).eyewear.en208.rb, 4, 'exact'],
  ];

  function co2() {
    return {
      limits: 'icnirp', lambda: 10600, mode: 'cw', P: 2000, T: 10, beam: g(18e-3 / S2, 1.5e-3 / S2),
      diffuse: { rho: 1, thetaDeg: 0, r: 0.5, T: 10 },
    };
  }
  function yag() {
    return { limits: 'icnirp', lambda: 532, mode: 'rp', Q: 0.425, tau: 4e-9, f: 10, T: 0.25, beam: g(5e-3 / S2, 0.6e-3 / S2), range: 100 };
  }
  function sur2010() {
    return { limits: 'aord', lambda: 532, mode: 'rp', Q: 0.425, tau: 4e-9, f: 10, T: 0.25, beam: g(1.24183297157288e-3 / S2, 0.6e-3 / S2) };
  }
  function pp3() {
    return { limits: 'aord', lambda: 1064, mode: 'rp', Q: 0.5, tau: 1e-8, f: 10, T: 10, beam: g(3e-3 / S2, 1e-3 / S2) };
  }
  function lasermet() {
    return { lambda: 532, mode: 'rp', Q: 1e-3, tau: 7e-9, f: 1e4, T: 0.25, beam: g(2e-3, 1e-3) };
  }

  const cache = new Map();
  function run(inp) {
    const k = JSON.stringify(inp);
    if (!cache.has(k)) cache.set(k, LE.analysis.analyze(inp));
    return cache.get(k);
  }

  function runAll() {
    cache.clear();
    const results = [];
    for (const v of VECTORS) {
      const [name, fn, expected, relTol] = v;
      let actual;
      let pass = false;
      let error = null;
      try {
        actual = fn();
        if (typeof expected === 'string' || relTol === 'exact') pass = actual === expected;
        else pass = Math.abs(actual - expected) <= (relTol || 1e-4) * Math.abs(expected);
      } catch (e) {
        error = String(e && e.message ? e.message : e);
      }
      results.push({ name, expected, actual, pass, error });
    }
    const failed = results.filter((r) => !r.pass);
    return { total: results.length, passed: results.length - failed.length, failed, results };
  }

  LE.selftest = { runAll, VECTORS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
