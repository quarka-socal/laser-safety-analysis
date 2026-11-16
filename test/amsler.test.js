'use strict';
/*
 * Amsler Grid testi: ızgara geometrisi (gerçek 5 mm kare ≈ 1° @ 30 cm), ekran ölçüsünün önceliği
 * (kartla ayar > Android ekran bilgisi > tarayıcı varsayımı), sonuç sınıflaması ve test geçmişi.
 * DOM gerektirmez.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { LE, near } = require('./helpers');

class MemStore {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
globalThis.localStorage = new MemStore();
const UI = path.join(__dirname, '..', 'js', 'ui');
for (const m of ['version', 'i18n', 'lang_en', 'render', 'amsler']) require(path.join(UI, m + '.js'));
const AM = LE.amsler;
const KEY_HIST = 'lazerEmniyet.amsler.v1';

/** devicePixelRatio ve Android köprüsü geçici olarak ayarlanır. */
function withEnv(env, fn) {
  const had = { dpr: 'devicePixelRatio' in globalThis, br: 'LazerAndroid' in globalThis };
  const old = { dpr: globalThis.devicePixelRatio, br: globalThis.LazerAndroid };
  globalThis.devicePixelRatio = env.dpr;
  if (env.bridge) globalThis.LazerAndroid = env.bridge;
  else delete globalThis.LazerAndroid;
  try {
    return fn();
  } finally {
    if (had.dpr) globalThis.devicePixelRatio = old.dpr; else delete globalThis.devicePixelRatio;
    if (had.br) globalThis.LazerAndroid = old.br; else delete globalThis.LazerAndroid;
  }
}
/** 420 dpi, 1080 × 2400 piksel (≈ 6,3") telefonun ekran bilgisi. */
const phone = (o) => ({
  screenMetrics: () => JSON.stringify(Object.assign({ xdpi: 420, ydpi: 420, density: 2.625, densityDpi: 420, widthPixels: 1080, heightPixels: 2400 }, o)),
});

test('standart ızgara: 5 mm kare 30 cm\'den ≈ 1°, 20 kare ≈ 19°; tam 1° için 28,6 cm', () => {
  assert.equal(AM.CELL_MM, 5);
  assert.equal(AM.MAX_CELLS, 20);
  near(AM.degPerCell(5, 300), 0.9549076, 1e-6); // 2·atan(2,5/300)
  near(20 * AM.degPerCell(5, 300), 19.09815, 1e-6);
  near(AM.distanceForOneDegree(5), 286.4716, 1e-6); // 2,5 / tan(0,5°)
});

test('yerleşim: kareler gerçek 5 mm, merkez noktası bir kesişimde (çift sayıda kare), en çok 20 × 20', () => {
  const sx = 420 / 25.4 / 2.625; // 420 dpi telefonda CSS piksel/mm
  const L = AM.layout(403, 690, sx, sx);
  assert.deepEqual([L.cols, L.rows], [12, 20]);
  near(L.cw * 2.625, (5 / 25.4) * 420, 1e-12, 'kare kenarı cihaz pikseli (≈ 82,7)');
  assert.ok(L.widthPx <= 403 && L.heightPx <= 690);
  near(L.degX, 12 * AM.degPerCell(5, 300), 1e-12);
  assert.deepEqual([AM.layout(4000, 3000, sx, sx).cols, AM.layout(4000, 3000, sx, sx).rows], [20, 20]);
  for (let w = 70; w < 900; w += 13) {
    const l = AM.layout(w, w * 1.7, sx, sx);
    assert.equal(l.cols % 2, 0, 'çift sütun');
    assert.equal(l.rows % 2, 0, 'çift satır');
    assert.ok(l.cols >= 2 && l.cols <= 20 && l.rows >= 2 && l.rows <= 20);
    if (w >= 2 * l.cw) assert.ok(l.widthPx <= w + 1e-9, 'ızgara alana sığar: ' + w);
  }
  const bad = AM.layout(NaN, undefined, sx, sx);
  assert.deepEqual([bad.cols, bad.rows], [2, 2], 'ölçü yoksa da geçerli ızgara');
});

test('ekran ölçüsü önceliği: tarayıcı varsayımı < Android ekran bilgisi < kartla ayar', () => {
  localStorage.clear();
  withEnv({ dpr: 1 }, () => {
    const m = AM.metrics();
    assert.equal(m.source, 'none');
    near(m.sx, 96 / 25.4, 1e-12);
  });
  withEnv({ dpr: 2.625, bridge: phone() }, () => {
    const m = AM.metrics();
    assert.equal(m.source, 'android');
    near(m.sx, 420 / 25.4 / 2.625, 1e-12);
    near(m.sy, 420 / 25.4 / 2.625, 1e-12);
    assert.equal(m.suspect, false);
    AM.saveCalibration(6.0);
    const c = AM.metrics();
    assert.equal(c.source, 'card');
    near(c.sx, 6.0, 1e-12);
    AM.clearCalibration();
    assert.equal(AM.metrics().source, 'android');
  });
  localStorage.clear();
});

test('kart ayarı cihaz pikseli/mm olarak saklanır: tarayıcı yakınlaştırması değişse de kare 5 mm kalır', () => {
  localStorage.clear();
  withEnv({ dpr: 1 }, () => AM.saveCalibration(4.0));
  withEnv({ dpr: 1.25 }, () => near(AM.metrics().sx, 3.2, 1e-12));
  withEnv({ dpr: 2 }, () => near(AM.metrics().sx, 2.0, 1e-12));
  localStorage.clear();
});

test('Android ekran bilgisi: şüpheli değer kartla doğrulamaya yönlendirir, geçersiz değer kullanılmaz', () => {
  localStorage.clear();
  withEnv({ dpr: 2.625, bridge: phone({ ydpi: 300 }) }, () => assert.equal(AM.metrics().suspect, true, 'xdpi ≠ ydpi'));
  withEnv({ dpr: 2.625, bridge: phone({ widthPixels: 10800, heightPixels: 24000 }) }, () => assert.equal(AM.metrics().suspect, true, '63" ekran'));
  withEnv({ dpr: 2.625, bridge: phone({ xdpi: 40, ydpi: 40 }) }, () => assert.equal(AM.metrics().source, 'none'));
  withEnv({ dpr: 2.625, bridge: { screenMetrics: () => 'bozuk' } }, () => assert.equal(AM.metrics().source, 'none'));
  withEnv({ dpr: 2.625, bridge: { screenMetrics: () => { throw new Error('eski kabuk'); } } }, () => assert.equal(AM.metrics().source, 'none'));
});

test('göz sonucu: işaretli kare sayısı, merkez (±2°) tutulumu; belirti tek başına bulgu sayılır', () => {
  assert.deepEqual(AM.eyeSummary([]), { n: 0, normal: true, central: false });
  for (const c of ['0,0', '-1,-1', '-2,-2', '1,1', '-2,1']) assert.equal(AM.eyeSummary([c]).central, true, c);
  for (const c of ['2,0', '-3,0', '0,2', '0,-3']) assert.equal(AM.eyeSummary([c]).central, false, c);
  assert.equal(AM.eyeSummary(['5,5', '6,5']).n, 2);
  assert.equal(AM.verdict({ R: [], L: [], sym: [] }).bad, false);
  assert.equal(AM.verdict({ R: [], L: [], sym: ['blur'] }).bad, true);
  assert.equal(AM.verdict({ R: [], L: ['5,5'] }).bad, true, 'eski kayıtta sym yok');
});

test('geçmiş: yeniden eskiye, bozuk kayıt atlanır; aynı kişinin önceki testi (büyük/küçük harf, İ/ı) bulunur', () => {
  localStorage.clear();
  const rec = (id, at, person, R, L) => ({ id, at, person, event: '', R, L, sym: [], cols: { R: 12, L: 12 }, rows: { R: 20, L: 20 }, source: 'android' });
  AM.saveRecord(rec('a', '2026-11-01T08:00:00.000Z', 'İsmail Yılmaz', [], []));
  AM.saveRecord(rec('b', '2026-11-10T08:00:00.000Z', 'Ayşe Kaya', ['0,0'], []));
  AM.saveRecord(rec('c', '2026-11-16T09:00:00.000Z', ' ISMAIL  yılmaz ', ['0,0', '1,0'], []));
  const raw = JSON.parse(localStorage.getItem(KEY_HIST));
  localStorage.setItem(KEY_HIST, JSON.stringify(raw.concat([{ id: 5 }, null, { id: 'x', at: 'z', R: 'yok', L: [] }, { id: 'y', at: 'z', R: ['a,b'], L: [] }])));
  const list = AM.loadHistory();
  assert.deepEqual(list.map((r) => r.id), ['c', 'b', 'a']);
  assert.equal(AM.previousFor(list[0], list).id, 'a');
  assert.equal(AM.previousFor(list[2], list), null, 'daha eski test yok');
  assert.equal(AM.previousFor(Object.assign({}, list[0], { person: '' }), list), null, 'adsız test karşılaştırılmaz');
  assert.deepEqual(AM.newCells(list[0].R, list[2].R), ['0,0', '1,0']);
  assert.deepEqual(AM.newCells(['0,0'], ['0,0', '3,3']), []);
  AM.saveRecord(Object.assign({}, list[1], { event: 'güncel' }));
  assert.equal(AM.loadHistory().filter((r) => r.id === 'b').length, 1, 'aynı kimlik tekrar eklenmez');
  AM.removeRecord('b');
  assert.deepEqual(AM.loadHistory().map((r) => r.id).sort(), ['a', 'c']);
  localStorage.clear();
});

test('kâğıt ızgara gerçek boyutta: 100 mm × 100 mm, 20 × 20 kare (21 + 21 çizgi), merkez noktası', () => {
  const s = AM.paperSVG();
  assert.match(s, /width="100mm" height="100mm"/);
  assert.match(s, /viewBox="0 0 100 100"/);
  assert.equal((s.match(/<line /g) || []).length, 42);
  assert.match(s, /<circle cx="50" cy="50"/);
});

test('kayıt ızgarası: işaretler doğru karede, test edilmeyen alan gri', () => {
  const s = AM.recordSVG({ cells: ['0,0', '-6,-10'], cols: 12, rows: 20 });
  assert.match(s, /<rect x="4" y="0" width="12" height="20" fill="#fff"\/>/, 'test edilen 12 × 20 alan');
  assert.match(s, /<rect x="10" y="10" width="1" height="1" fill="#e00"/, 'merkezin sağ altındaki kare');
  assert.match(s, /<rect x="4" y="0" width="1" height="1" fill="#e00"/, 'sol üst köşe');
  assert.match(s, /<circle cx="10" cy="10"/);
});

test('Türkçe ekranlar: sonuç önerisi, kaynaklar ve gerçek boyut uyarısı', () => {
  const bad = { id: 'r1', at: '2026-11-16T09:00:00.000Z', person: 'Ayşe Kaya', event: '532 nm', R: ['0,0'], L: [], sym: ['spot'], cols: { R: 12, L: 12 }, rows: { R: 20, L: 20 }, source: 'android' };
  const ok = Object.assign({}, bad, { id: 'r2', R: [], sym: [] });
  const rb = AM.html.result(bad, null, true);
  assert.match(rb, /göz hekimine/);
  assert.match(rb, /merkez/);
  const rn = AM.html.result(ok, bad, true);
  assert.match(rn, /hasarı dışlamaz/);
  assert.match(rn, /Önceki test/);
  const intro = AM.html.intro();
  assert.match(intro, /30 cm/);
  assert.match(intro, /Amsler M\. Br J Ophthalmol 1953/);
  assert.match(intro, /Crossland/);
  assert.match(AM.html.paper(), /%100/);
  assert.match(AM.html.report(bad, null), /Testi uygulayan/);
});
