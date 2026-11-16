'use strict';
/*
 * Çapraz doğrulama: Kentek EasyHaz LSO 2014 (ANSI Z136.1-2014) ile.
 *
 * Referans veriler, kullanıcının EasyHaz çalışma kitabı LibreOffice'te makrolar
 * kapalıyken hücre formülleri yeniden hesaplatılarak üretildi
 * (tools/easyhaz_oracle.py). Beklenen davranış:
 *   1) Lazer Emniyet hiçbir vakada EasyHaz'dan daha az koruyucu olmamalı
 *      (OD/NHZ büyük ya da eşit, MPE küçük ya da eşit — tolerans içinde).
 *   2) Ortak kurallarda (aynı standart satırı) sonuçlar eşit olmalı.
 * Bilinen ve belgelenmiş farklar OKUBENI.md "Doğrulama" bölümündedir.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { LE } = require('./helpers');
const A = LE.analysis;

const VAL = require(path.join(__dirname, 'data', 'easyhaz_validation.json'));
const GRID = require(path.join(__dirname, 'data', 'easyhaz_mpe_grid.json'));

function toInput(c, range, limits) {
  const e2 = c.BE_beam_e_e2 === '(1/e2)';
  const k = e2 ? Math.SQRT2 : 1;
  const d = (c.d * 1e-3) / k;
  const phi = (c.div * 1e-3) / k;
  const inp = {
    limits: limits || 'icnirp', lambda: c.wl, mode: c.mode, beam: { profile: 'gauss', dx: d, dy: d, phix: phi, phiy: phi }, range,
    Tskin: c.t,
    diffuse: { rho: (c.BE_spectral_ref === undefined ? 100 : c.BE_spectral_ref) / 100, thetaDeg: c.BE_veiw_angle || 0, r: c.BE_view_range || 0.5, T: 600 },
  };
  if (c.mode === 'cw') Object.assign(inp, { P: c.value, T: c.t });
  if (c.mode === 'sp') Object.assign(inp, { Q: c.value, tau: c.tau });
  if (c.mode === 'rp') Object.assign(inp, { Q: c.value, tau: c.tau, f: c.prf, T: c.t });
  if (c.BE_fl_lens) inp.lens = { f: c.BE_fl_lens * 1e-3, b: (c.BE_LoL_maj_dia * 1e-3) / k, range: c.BE_LoL_Range };
  if (c.BE_fiber_type === 'multimode') inp.fiber = { type: 'multi', NA: c.BE_NA, range: c.BE_FO_ObsR_Rng };
  if (c.BE_fiber_type === 'single mode') inp.fiber = { type: 'single', MFD: c.BE_NA * 1e-9, range: c.BE_FO_ObsR_Rng };
  return inp;
}

const tally = {};
function check(key, mine, eh, higherIsSafer, tol, ctx) {
  if (typeof eh !== 'number' || !Number.isFinite(eh) || !Number.isFinite(mine)) return;
  const t = (tally[key] = tally[key] || { n: 0, eq: 0, safer: 0 });
  t.n++;
  const diff = higherIsSafer ? mine - eh : eh - mine;
  const scale = tol.rel ? Math.max(Math.abs(eh), 1e-30) * tol.rel : tol.abs;
  if (Math.abs(mine - eh) <= scale) t.eq++;
  else if (diff > 0) t.safer++;
  assert.ok(diff >= -scale, key + ': Lazer Emniyet EasyHaz\'dan daha az koruyucu → benim ' + mine + ', EasyHaz ' + eh + ' | ' + JSON.stringify(ctx));
}

test('EasyHaz LSO 2014 ile 400 rastgele vaka: hiçbir çıktıda daha az koruyucu değil', () => {
  for (const g of VAL.cases) {
    const c = g.c;
    const o0 = A.analyze(toInput(c, 0));
    assert.equal(o0.ok, true, JSON.stringify(c) + ' ' + o0.errors);
    for (const r of VAL.ranges_m) {
      const eh = g.odr[String(r)];
      const o = r === 0 ? o0 : A.analyze(toInput(c, r));
      check('OD (gözlem mesafesi)', o.eye.odAtRange, eh, true, { abs: 0.02 }, { id: c.id, r });
      // varsayılan "en koruyucu" mod (ICNIRP + 2006/25/AT) de hiçbir zaman daha az koruyucu olmamalı
      const ob = A.analyze(toInput(c, r, 'both'));
      assert.ok(ob.eye.odAtRange >= o.eye.odAtRange - 1e-12, 'both < icnirp: ' + JSON.stringify({ id: c.id, r }));
    }
    const e = g.eh;
    check('En kötü durum OD', o0.eye.odWorst, e.od_worst, true, { abs: 0.02 }, { id: c.id });
    check('Yaygın yansıma NHZ', o0.diffuse.eye.nhz, e.dr_nhz, true, { rel: 0.01 }, { id: c.id });
    check('Yaygın yansıma OD', A.od(o0.diffuse.eye.ratioAtR), e.dr_od, true, { abs: 0.02 }, { id: c.id });
    check('Deri yaygın NHZ', o0.diffuse.skin.nhz, e.dr_skin_nhz, true, { rel: 0.01 }, { id: c.id });
    if (e.times_skin > 0) check('Deri MPE katı (log)', Math.log10(o0.skin.timesMPE), Math.log10(e.times_skin), true, { abs: 0.01 }, { id: c.id });
    if (o0.fiber) check('Fiber OD', o0.fiber.odAtRange, e.fo_od, true, { abs: 0.02 }, { id: c.id });
    // Mercekte çok hızlı odaklamada (b/f > 0,2) EasyHaz farklı bir ıraksama modeli kullanıyor: ≤ 0,06 OD
    if (o0.lens) check('Mercek OD', o0.lens.odAtRange, e.lol_od, true, { abs: 0.06 }, { id: c.id });
    if (c.mode === 'rp') {
      const br = o0.eye.summary.byRule;
      if (br.K1 && e.rule1 > 0) check('Kural 1 MPE (log)', Math.log10(br.K1.perPulseH * 1e-4), Math.log10(e.rule1), false, { abs: 0.01 }, { id: c.id });
      if (br.K2 && e.rule2 > 0) check('Kural 2 MPE (log)', Math.log10(br.K2.perPulseH * 1e-4), Math.log10(e.rule2), false, { abs: 0.01 }, { id: c.id });
    }
  }
  const od = tally['OD (gözlem mesafesi)'];
  assert.ok(od.n >= 1500);
  assert.ok(od.eq / od.n >= 0.9, 'OD eşitlik oranı %' + (100 * od.eq / od.n).toFixed(1));
  // özet (test çıktısında görünür)
  for (const k of Object.keys(tally)) {
    const t = tally[k];
    console.log('  ' + k.padEnd(26) + ' n=' + String(t.n).padStart(4) + '  eşit=' + String(t.eq).padStart(4) + '  daha koruyucu=' + String(t.safer).padStart(4) + '  daha az koruyucu=0');
  }
});

test('MPE taraması (64 dalga boyu × 40 süre): hiçbir noktada EasyHaz MPE\'sinden yüksek değil', () => {
  let n = 0;
  let eq = 0;
  // EasyHaz'ın 1400–1450 nm deri MPE'si 5 s'de süreyle azalan (fiziksel olmayan) bir değer veriyor:
  const ehBug = (wl, mode, t, skin) => skin && (wl === 1400 || wl === 1450) && mode === 'cw' && t === 5;
  for (const [wl, mode, t, mpeEye, mpeSkin] of GRID.rows) {
    const eyeComps = LE.mpe.eyeComponents(wl, t, {}).filter((c) => c.mech !== 'on-segment');
    const H = LE.mpe.governing(eyeComps).H;
    const mine = (mode === 'sp' ? H : H / t) * 1e-4;
    n++;
    if (Math.abs(mine / mpeEye - 1) <= 0.02) eq++;
    assert.ok(mine <= mpeEye * 1.02, 'göz ' + wl + ' nm ' + mode + ' t=' + t + ': benim ' + mine + ' > EasyHaz ' + mpeEye);
    if (typeof mpeSkin === 'number' && mpeSkin > 0 && !ehBug(wl, mode, t, true)) {
      const Hs = LE.mpe.skinMPE_H(wl, t, {});
      const ms = (mode === 'sp' ? Hs : Hs / t) * 1e-4;
      assert.ok(ms <= mpeSkin * 1.02, 'deri ' + wl + ' nm ' + mode + ' t=' + t + ': benim ' + ms + ' > EasyHaz ' + mpeSkin);
    }
  }
  assert.ok(eq / n >= 0.93, 'MPE eşitlik oranı %' + (100 * eq / n).toFixed(1));
  console.log('  MPE taraması: n=' + n + ', eşit=' + eq + ' (%' + (100 * eq / n).toFixed(1) + '), kalanların tümü daha koruyucu');
});
