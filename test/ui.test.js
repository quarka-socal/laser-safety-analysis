'use strict';
/*
 * Arayüz metinleri, rapor ve envanter yardımcıları (DOM gerektirmeyen kısımlar).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { LE, gauss } = require('./helpers');
for (const m of ['render', 'report', 'store']) require(path.join(__dirname, '..', 'js', 'ui', m + '.js'));
const A = LE.analysis;
const U = LE.units;
const S2 = Math.SQRT2;
const fakeState = (v) => ({ v: Object.assign({ name: 'Deneme', date: '16.11.2026', spec: '1/e2' }, v || {}), u: {} });
const meta = { reportId: 'LEA-TEST', selftest: { passed: 64, total: 64 } };

test('notlarda sayılar Türkçe biçimde (ondalık virgül)', () => {
  const o = A.analyze({ lambda: 532, mode: 'cw', P: 1, T: 1.5, beam: gauss(2e-3, 1e-3), alpha: 2.3 });
  const all = o.notes.join(' | ');
  assert.match(all, /1,5 s kasıtlı/);
  assert.match(all, /α = 2,3 mrad/);
  assert.doesNotMatch(all, /\d\.\d/);
});

test('1250–1400 nm: ikili sınır bilgisi doğru ve uyarı değil not olarak', () => {
  const o = A.analyze({ lambda: 1319, mode: 'cw', P: 1, T: 10, beam: gauss(2e-3, 1e-3) });
  assert.ok(!o.warnings.some((w) => /1250–1400/.test(w)), 'uyarılarda olmamalı');
  const n = o.notes.find((x) => /1200–1400 nm/.test(x));
  assert.ok(n, 'not bulunmalı');
  assert.match(n, /ANSI Z136\.1-2014 kornea\/lens/);
  assert.match(n, /2 × deri/);
});

test('2006/25/AT T_min: Tablo 2.6 aralıkları harfiyen (üstten kapalı); komşu grubun T_min\'i daha koruyucu değil', () => {
  assert.equal(LE.aord.Tmin(400), 1e-9, '315 < λ ≤ 400 nm');
  assert.equal(LE.aord.Tmin(1400), 50e-6, '1050 < λ ≤ 1400 nm');
  assert.equal(LE.aord.Tmin(400.1), 18e-6);
  assert.equal(LE.aord.Tmin(1400.1), 1e-3);
  // 400 nm, 1 ps, 1 MHz: 18 µs gruplaması seçilseydi NOHD 436 m yerine 224 m olurdu (Kural 3 daha gevşek)
  const inp = { limits: 'aord', lambda: 400, mode: 'rp', Q: 1e-6, tau: 1e-12, f: 1e6, T: 0.25, beam: gauss(2e-3, 1e-3) };
  const lit = LE.analysis.analyze(inp).eye.nohd;
  const near400 = LE.analysis.analyze(Object.assign({}, inp, { lambda: 400.1 })).eye.nohd;
  assert.ok(lit > 1.5 * near400, 'tam 400 nm (1 ns gruplama) 400,1 nm\'den (18 µs) daha koruyucu');
});

test('rapor: yalnız 2006/25/AT modunda bu setin faktörleri yazılır', () => {
  const o = A.analyze({ limits: 'aord', lambda: 532, mode: 'rp', Q: 1e-6, tau: 7e-9, f: 1e5, T: 0.25, beam: gauss(2e-3, 1e-3) });
  const html = LE.report.build(o, fakeState(), meta);
  assert.match(html, /2006\/25\/AT: [^<]*T_min = 18 µs/);
  assert.match(html, /2006\/25\/AT: [^<]*C_P = 0,\d+/);
  assert.doesNotMatch(html, /ICNIRP 2013: /, 'kullanılmayan set yazılmaz');
  assert.doesNotMatch(html, /Tᵢ = 5 µs/);
  const both = LE.report.build(A.analyze(Object.assign({}, o.input, { limits: 'both' })), fakeState(), meta);
  assert.match(both, /ICNIRP 2013: /);
  assert.match(both, /2006\/25\/AT: /);
});

test('rapor: dürbün uygulanmayan dalga boyunda "Evet" yazmaz; dürbünlü OD kutusu belirtilir', () => {
  const uv = A.analyze({ lambda: 266, mode: 'cw', P: 0.1, T: 3e4, beam: gauss(1e-3, 1e-3), oav: { on: true } });
  const h1 = LE.report.build(uv, fakeState(), meta);
  assert.doesNotMatch(h1, /Evet, 50 mm objektif/);
  assert.match(h1, /bu dalga boyunda uygulanmadı/);
  const vis = A.analyze({ lambda: 532, mode: 'cw', P: 1, T: 0.25, range: 100, beam: gauss(2e-3 / S2, 1e-3 / S2), oav: { on: true } });
  const h2 = LE.report.build(vis, fakeState(), meta);
  assert.match(h2, /OD @ 100 m \(dürbünle\)/);
});

test('karar metni: NOHD yokken "bu mesafe içinde" denmez', () => {
  const o = A.analyze({ lambda: 532, mode: 'cw', P: 5e-3, T: 0.25, beam: gauss(20e-3, 1e-3) });
  assert.equal(o.eye.nohd, 0);
  assert.ok(o.eye.odWorst > 0);
  const v = LE.render.verdict(o);
  assert.doesNotMatch(v, /Bu mesafe içinde/);
  assert.match(v, /daraltılır ya da odaklanırsa/);
  const g = LE.render.verdict(A.analyze({ lambda: 532, mode: 'cw', P: 1, T: 0.25, beam: gauss(2e-3, 1e-3) }));
  assert.match(g, /Bu mesafe içinde/);
});

test('yüzde Türkçe yazımla (%x)', () => {
  assert.equal(U.fmtPct(0.001), '%0,1');
  assert.equal(U.fmtPct(0.9), '%90');
  const o = A.analyze({ lambda: 1064, mode: 'rp', Q: 1e-3, tau: 100e-9, f: 2e4, T: 10, beam: gauss(5e-3, 1e-3) });
  assert.match(LE.render.derivedCard(o), /Görev oranı<\/td><td>%0,2</);
});

test('envanter: özeti olmayan (içe aktarılmış) kayıt kopyalanabilir', () => {
  const src = { id: 'A1', state: { v: { name: 'X' }, u: {} } };
  let c;
  assert.doesNotThrow(() => { c = LE.store.duplicate(src); });
  assert.notEqual(c.id, 'A1');
  assert.equal(c.state.v.name, 'X (kopya)');
  assert.equal(c.summary.name, 'X (kopya)');
  assert.equal(src.state.v.name, 'X', 'kaynak kayıt değişmez');
});
