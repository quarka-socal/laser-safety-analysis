'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { LE, gauss } = require('./helpers');
require(path.join(__dirname, '..', 'js', 'ui', 'render.js'));
const A = LE.analysis;
const U = LE.units;

const S2 = Math.SQRT2;
const uv = { lambda: 355, mode: 'rp', P: 5, tau: 20e-9, f: 30e3, T: 3e4, beam: gauss(1e-3 / S2, 1e-3 / S2) };
// "Yeşil DPSS 532 nm, 1 W" örneği (2 mm, 1 mrad 1/e²; gözlem 5 m) — ENOHD 2,14 km
const green = { lambda: 532, mode: 'cw', P: 1, T: 0.25, range: 5, beam: gauss(2e-3 / S2, 1e-3 / S2) };
// "He-Ne 632,8 nm, 1 mW" örneği — OD sıfırın çok az üstünde (0,009) seyreder
const hene = { lambda: 632.8, mode: 'cw', P: 1e-3, T: 0.25, beam: gauss(0.8e-3 / S2, 1e-3 / S2) };
const ON = { oav: { on: true }, scint: { on: true, factor: 10 } };

// render.js eksen sabitleri
const W = 760, L = 46, R = 14, R_MIN = 0.1;

/** Grafiğin mesafe aralığı. */
const rMaxOf = (o) => LE.render.chartRange(o);

/** SVG koordinatlarını (mesafe, OD) değerlerine çeviren ters dönüşümler. */
function axes(svg, o) {
  const rMax = rMaxOf(o);
  const ticks = [...svg.matchAll(/<text x="40" y="([\d.]+)" font-size="11" text-anchor="end" fill="var\(--muted\)">(\d+)<\/text>/g)]
    .map((m) => [+m[2], +m[1] - 4]);
  const y0 = ticks.find((t) => t[0] === 0)[1];
  const top = ticks[ticks.length - 1];
  const scale = (y0 - top[1]) / top[0];
  return {
    r: (px) => Math.pow(10, Math.log10(R_MIN) + ((px - L) / (W - L - R)) * (Math.log10(rMax) - Math.log10(R_MIN))),
    od: (py) => (y0 - py) / scale,
  };
}

/** SVG'deki işaret çizgilerinin mesafeleri. */
function markDistances(svg, o) {
  const ax = axes(svg, o);
  return [...svg.matchAll(/<line class="mark" x1="([\d.]+)"/g)].map((m) => ax.r(+m[1]));
}

/** Çizgi rengine göre eğriler: [[mesafe, OD], …] parçaları. */
function curves(svg, o) {
  const ax = axes(svg, o);
  const out = {};
  for (const m of svg.matchAll(/<path d="([^"]+)" fill="none" stroke="([^"]+)"/g)) {
    out[m[2]] = m[1].split(/(?=M)/).map((seg) => seg.trim().split(/(?=[ML])/).map((p) => {
      const [px, py] = p.slice(1).trim().split(' ').map(Number);
      return [ax.r(px), ax.od(py)];
    }));
  }
  return out;
}

/** Eğrinin sıfır (MPE) çizgisini son kez yukarıdan aşağı kestiği mesafe (log r'de doğrusal ara değer). */
function lastZeroCrossing(segs) {
  const pts = segs.flat();
  let r = null;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [r1, v1] = pts[i];
    const [r2, v2] = pts[i + 1];
    if (v1 > 0 && v2 <= 0) r = Math.pow(10, Math.log10(r1) + (Math.log10(r2) - Math.log10(r1)) * (v1 / (v1 - v2)));
  }
  return r;
}

/** Mesafe ekseni etiketleri ve yaklaşık kapladıkları aralıklar (11 px yazı ≈ 6,4 px/karakter). */
function axisLabels(svg) {
  return [...svg.matchAll(/<text x="([\d.]+)" y="242" font-size="11" text-anchor="(middle|end)" fill="var\(--muted\)">([^<]+)<\/text>/g)]
    .map((m) => {
      const w = m[3].length * 6.4;
      const xx = +m[1];
      return { t: m[3], a: m[2] === 'end' ? xx - w : xx - w / 2, b: m[2] === 'end' ? xx : xx + w / 2 };
    })
    .sort((p, q) => p.a - q.a);
}

test('grafik: NOHD, ENOHD (dürbün) ve türbülans NOHD işaretleri doğru yerde', () => {
  const o = A.analyze(Object.assign({}, uv, ON));
  const svg = LE.render.chart(o);
  assert.ok(svg.includes('>NOHD ' + U.fmtDist(o.eye.nohd) + '<'));
  assert.ok(svg.includes('>ENOHD (dürbün) ' + U.fmtDist(o.eye.enohd) + '<'));
  assert.ok(svg.includes('>NOHD (türbülans +1 OD) ' + U.fmtDist(o.eye.scint.nohd) + '<'));
  const d = markDistances(svg, o);
  assert.equal(d.length, 3);
  const want = [o.eye.nohd, o.eye.enohd, o.eye.scint.nohd];
  d.forEach((v, i) => assert.ok(Math.abs(v / want[i] - 1) < 1e-3, 'işaret ' + i + ': ' + v + ' / ' + want[i]));
});

test('grafik: seçenek kapalıysa ya da uygulanmıyorsa işaret yok', () => {
  const o = A.analyze(uv);
  const svg = LE.render.chart(o);
  assert.ok(!svg.includes('ENOHD'));
  assert.ok(!svg.includes('türbülans'));
  assert.equal(markDistances(svg, o).length, 1);
  const ir = A.analyze({ lambda: 10600, mode: 'cw', P: 100, T: 10, beam: gauss(10e-3, 2e-3), oav: { on: true } });
  assert.ok(!LE.render.chart(ir).includes('ENOHD'), '10,6 µm: dürbün uygulanmaz');
});

test('grafik: sonsuz ya da aralık altındaki NOHD için işaret çizilmez', () => {
  const inf = A.analyze({ lambda: 532, mode: 'cw', P: 1, T: 0.25, beam: gauss(2e-3, 0) });
  assert.equal(inf.eye.nohdInf, true);
  const s1 = LE.render.chart(inf);
  assert.ok(!s1.includes('class="mark"'), 'ıraksama sıfır: NOHD sonsuz, çizgi yok');
  assert.ok(!/NaN|Infinity/.test(s1));
  const safe = A.analyze({ lambda: 532, mode: 'cw', P: 0.5e-3, T: 0.25, beam: gauss(2e-3, 1e-3) });
  assert.equal(safe.eye.nohd, 0);
  const s2 = LE.render.chart(safe);
  assert.ok(!s2.includes('class="mark"'), 'NOHD = 0: çizgi yok');
  assert.ok(!/NaN|Infinity/.test(s2));
});

test('grafik: her eğri sıfır (MPE) çizgisini kendi tehlike mesafesi işaretinde keser', () => {
  // Kullanıcı bildirimi: Yeşil DPSS + dürbünde ENOHD 2,14 km iken eğriler 1 km'den sonra sıfır görünüyordu.
  // Eğriler artık sıfırda kesilmeden MPE altı bandına iner; görünen kesişim motorun mesafesiyle örtüşmeli.
  for (const [name, inp, tol] of [['yeşil DPSS', green, 0.005], ['UV DPSS', uv, 0.005], ['He-Ne', hene, 0.02]]) {
    const o = A.analyze(Object.assign({}, inp, ON));
    const svg = LE.render.chart(o);
    assert.ok(svg.includes('class="safe-band"'), name + ': MPE altı bandı');
    const c = curves(svg, o);
    for (const [stroke, want, label] of [['var(--danger)', o.eye.nohd, 'NOHD'], ['var(--accent)', o.eye.enohd, 'ENOHD'], ['var(--scint)', o.eye.scint.nohd, 'türbülans NOHD']]) {
      const got = lastZeroCrossing(c[stroke]);
      assert.ok(got !== null && Math.abs(got / want - 1) < tol, name + ' ' + label + ': grafik ' + got + ' m, motor ' + want + ' m');
    }
  }
  // kullanıcının vakası: dürbün eğrisi 1 km'de hâlâ OD ≈ 0,66 (sıfır değil)
  const o = A.analyze(Object.assign({}, green, ON));
  const blue = curves(LE.render.chart(o), o)['var(--accent)'].flat();
  const near1km = blue.reduce((b, p) => (Math.abs(Math.log10(p[0] / 1000)) < Math.abs(Math.log10(b[0] / 1000)) ? p : b));
  const odEngine = A.od(A.intrabeamEval(o.eye.criteria, { beam: o.input.beam, model: 'quad', mu: 0, oav: o.eye.oav }, near1km[0]).ratio);
  assert.ok(Math.abs(near1km[1] - odEngine) < 0.01, 'dürbün eğrisi ' + near1km[0] + ' m: ' + near1km[1] + ' / ' + odEngine);
  assert.ok(near1km[1] > 0.6, '1 km civarında OD > 0,6');
});

test('grafik: gözlem noktası motorun gözlem mesafesi değerinde', () => {
  const o = A.analyze(Object.assign({}, green, ON));
  const svg = LE.render.chart(o);
  const dot = svg.match(/<circle class="obs" cx="[\d.]+" cy="([\d.]+)"/);
  assert.ok(dot);
  assert.ok(Math.abs(axes(svg, o).od(+dot[1]) - o.eye.odAtRange) < 0.005);
});

test('grafik: logaritmik eksen ara etiketleri okunur ve çakışmaz', () => {
  const o = A.analyze(Object.assign({}, green, ON));
  const labs = axisLabels(LE.render.chart(o)).map((l) => l.t);
  // 1 km ile ENOHD (2,14 km) arasının okunabilmesi için 2 km etiketi bulunmalı
  for (const t of ['1 km', '2 km', '500 m', '1 m']) assert.ok(labs.includes(t), t + ' etiketi: ' + labs.join(', '));
  // kısa ve çok uzun eksenlerde etiketler üst üste binmez ve grafiğin içinde kalır
  const spans = [
    hene,
    green,
    uv,
    { lambda: 532, mode: 'rp', Q: 0.4, tau: 5e-9, f: 10, T: 0.25, range: 10, beam: gauss(7e-3 / S2, 0.6e-3 / S2) },
    { lambda: 532, mode: 'cw', P: 1, T: 0.25, beam: gauss(2e-3, 0) }, // NOHD sonsuz → 10 000 km eksen
  ];
  for (const inp of spans) {
    const oo = A.analyze(Object.assign({}, inp, ON));
    const l = axisLabels(LE.render.chart(oo));
    assert.ok(l.length >= 3);
    for (let i = 1; i < l.length; i++) assert.ok(l[i].a - l[i - 1].b >= 2, 'çakışma: ' + l[i - 1].t + ' / ' + l[i].t);
    assert.ok(l[0].a >= 0 && l[l.length - 1].b <= W, 'kenar taşması');
  }
});

test('grafik okuma: değerler motordan, eğri sırası ve metin biçimi', () => {
  const o = A.analyze(Object.assign({}, green, ON));
  const e = o.eye;
  const ctx = { beam: o.input.beam, model: 'quad', mu: 0, oav: { on: false } };
  const at1km = LE.render.chartReadout(o, 1000);
  assert.deepEqual(at1km.map((v) => v.key), ['eye', 'oav', 'scint', 'skin']);
  const byKey = Object.fromEntries(at1km.map((v) => [v.key, v]));
  // dürbünle 1 km: OD 0,66 (kullanıcının sorduğu nokta)
  const odO = A.od(A.intrabeamEval(e.criteria, Object.assign({}, ctx, { oav: e.oav }), 1000).ratio);
  assert.ok(Math.abs(byKey.oav.od - odO) < 1e-12);
  assert.equal(byKey.oav.text, 'OD ' + U.fmtOD(odO));
  assert.equal(byKey.oav.text, 'OD 0,66');
  // çıplak göz 1 km'de MPE altında: oran metinde
  const rE = A.intrabeamEval(e.criteria, ctx, 1000).ratio;
  assert.ok(rE < 1 && byKey.eye.od === 0);
  assert.equal(byKey.eye.text, 'MPE altında (' + U.fmt(rE, 2) + ' × MPE)');
  // ENOHD'nin hemen önü ve arkası
  const before = LE.render.chartReadout(o, e.enohd * 0.995).find((v) => v.key === 'oav');
  const after = LE.render.chartReadout(o, e.enohd * 1.005).find((v) => v.key === 'oav');
  assert.ok(before.od > 0 && /^OD /.test(before.text), before.text);
  assert.ok(after.od === 0 && /^MPE altında/.test(after.text), after.text);
  // seçenekler kapalıyken yalnız çıplak göz ve deri
  assert.deepEqual(LE.render.chartReadout(A.analyze(green), 10).map((v) => v.key), ['eye', 'skin']);
  // sınırda aşım (1 mW He-Ne, OD 0,009) sıfır gibi gösterilmez
  const h = LE.render.chartReadout(A.analyze(hene), 1).find((v) => v.key === 'eye');
  assert.ok(h.od > 0 && h.od < 0.01);
  assert.equal(h.text, 'OD < 0,01');
});

test('grafik okuma: çizilen eğrilerle aynı değerler', () => {
  const o = A.analyze(Object.assign({}, green, ON));
  const svg = LE.render.chart(o);
  const c = curves(svg, o);
  const colors = { eye: 'var(--danger)', oav: 'var(--accent)', scint: 'var(--scint)', skin: 'var(--warn)' };
  for (const key of Object.keys(colors)) {
    const pts = c[colors[key]].flat().filter((p) => p[1] > 0.05); // sıfırın üstündeki noktalar
    for (const p of [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]]) {
      const v = LE.render.chartReadout(o, p[0]).find((q) => q.key === key);
      assert.ok(Math.abs(v.od - p[1]) < 0.01, key + ' @ ' + p[0] + ' m: okuma ' + v.od + ', grafik ' + p[1]);
    }
  }
});

test('grafik okuma: MPE\'nin hemen altı "1 × MPE" diye yuvarlanmaz', () => {
  const o = A.analyze(Object.assign({}, green, ON));
  const s = LE.render.chartReadout(o, o.eye.scint.nohd * 0.99995).find((v) => v.key === 'scint');
  const u = LE.render.chartReadout(o, o.eye.scint.nohd * 1.00005).find((v) => v.key === 'scint');
  assert.ok(s.od > 0, s.text);
  assert.ok(u.ratio < 1 && u.ratio > 0.999);
  assert.equal(u.text, 'MPE altında (0,99 × MPE)');
});
