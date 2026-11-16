'use strict';
/*
 * Dil desteği: İngilizce arayüzde Türkçe metin kalmamalı, hiçbir anahtar eksik olmamalı ve
 * hesap sonuçları dilden bağımsız olmalı. Türkçe görünüm (varsayılan) değişmemeli.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { LE, gauss } = require('./helpers');
const UI = path.join(__dirname, '..', 'js', 'ui');
for (const m of ['version', 'i18n', 'lang_en', 'examples', 'form', 'render', 'report', 'store', 'help', 'license', 'about', 'amsler']) require(path.join(UI, m + '.js'));
const I = LE.i18n;
const A = LE.analysis;

const TR_LETTERS = /[çğıöşüÇĞİÖŞÜ]/;
const TR_WORDS = /\b(ve|ile|veya|darbe|darbelik|Kural|mesafe|mesafede|Yok|Evet|Deri|deri|Tek|tek|gibi|olarak|kadar|altı|satırı|Tablo|grupları|sınır|MSD|yok|kapalı|Sürekli|Açık|Koyu|Rapor|Kaydet|Kapat|Yardım)\b/;
const fake = () => ({ innerHTML: '', querySelector: () => null });

/** Kaynak koddaki T('…') anahtarları, form tanımları ve index.html çeviri öznitelikleri. */
function allKeys() {
  const keys = new Set();
  const unq = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  for (const f of ['form', 'render', 'report', 'app', 'store', 'about', 'amsler']) {
    const src = fs.readFileSync(path.join(UI, f + '.js'), 'utf8');
    for (const m of src.matchAll(/\bT\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(unq(m[1]));
    // üçlü ifadeler: T(koşul ? 'a' : 'b', …)
    for (const m of src.matchAll(/\bT\([^'()]*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*(?:[^'()]*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*)?'((?:[^'\\]|\\.)*)'/g)) {
      for (const k of [m[1], m[2], m[3]]) if (k) keys.add(unq(k));
    }
  }
  for (const s of LE.form.SECTIONS) {
    keys.add(s.title);
    for (const f of s.fields) {
      for (const k of ['label', 'labelEllip', 'help', 'placeholder']) if (f[k]) keys.add(f[k]);
      if (f.options) for (const o of f.options) keys.add(o[1]);
      if (f.items) for (const it of f.items) keys.add(it[2]);
    }
  }
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-ph|-title|-aria)?="([^"]*)"/g)) keys.add(m[1]);
  return [...keys].filter((k) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(k));
}

/** Örnek lazerler ve rastgele girişler: her biri motor sonucu. */
function cases() {
  const out = [];
  for (const ex of LE.examples) {
    const s = LE.form.defaultState();
    Object.assign(s.v, ex.v, { name: ex.en.name });
    Object.assign(s.u, ex.u || {});
    LE.form.setState(s);
    const r = LE.form.read();
    out.push({ inp: r.inp, state: LE.form.getState() });
  }
  let seed = 2024;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lu = (a, b) => Math.exp(Math.log(a) + rnd() * (Math.log(b) - Math.log(a)));
  const wls = [193, 266, 302.3, 308, 355, 405, 450, 532, 633, 808, 1064, 1300, 1319, 1550, 2940, 10600];
  for (let i = 0; i < 160; i++) {
    const mode = ['cw', 'sp', 'rp'][Math.floor(rnd() * 3)];
    const inp = {
      lambda: wls[Math.floor(rnd() * wls.length)], mode, T: lu(0.1, 3e4), limits: ['both', 'icnirp', 'aord'][Math.floor(rnd() * 3)],
      beam: gauss(lu(1e-4, 3e-2), lu(1e-5, 1e-2)), range: rnd() < 0.5 ? lu(0.1, 1e3) : 0, alpha: rnd() < 0.2 ? lu(2, 150) : 0,
      oav: { on: rnd() < 0.4 }, scint: { on: rnd() < 0.6, factor: 10 }, mu: rnd() < 0.2 ? 1e-4 : 0,
      diffuse: rnd() < 0.7 ? { rho: rnd(), thetaDeg: 10, r: 0.5, T: 600, extended: rnd() < 0.3, spotD: 5e-3 } : undefined,
      lens: rnd() < 0.2 ? { f: (rnd() < 0.3 ? -0.1 : 0.15), b: 5e-3, range: 1 } : undefined,
      fiber: rnd() < 0.2 ? { type: rnd() < 0.5 ? 'multi' : 'single', NA: 0.22, MFD: 1e-5, range: 0.5 } : undefined,
      eyewear: { window: 10, d: rnd() < 0.2 ? 5e-4 : 0 },
    };
    if (mode === 'cw') inp.P = lu(1e-6, 1e3);
    else { inp.Q = lu(1e-10, 1); inp.tau = lu(1e-14, 1e-3); if (mode === 'rp') { inp.f = Math.min(lu(1, 1e8), 0.5 / inp.tau); inp.T = Math.max(inp.T, 2 * inp.tau); } }
    out.push({ inp, state: { v: { name: 'Test laser ' + i, cls: '4', status: 'Aktif', spec: '1/e2', date: '16.11.2026' }, u: {} } });
  }
  return out;
}

function englishProblems(html) {
  const text = html.replace(/<[^>]+>/g, ' ');
  const p = [];
  const m1 = text.match(TR_LETTERS);
  if (m1) p.push('Türkçe harf: …' + text.slice(Math.max(0, m1.index - 60), m1.index + 40) + '…');
  const m2 = text.match(TR_WORDS);
  if (m2) p.push('Türkçe sözcük "' + m2[0] + '": …' + text.slice(Math.max(0, m2.index - 60), m2.index + 40) + '…');
  const m3 = text.match(/\d,\d/);
  if (m3) p.push('ondalık virgül: …' + text.slice(Math.max(0, m3.index - 40), m3.index + 20) + '…');
  if (/2006\/25\/AT/.test(text)) p.push('2006/25/AT (İngilizcede 2006/25/EC olmalı)');
  return p;
}

test('her çeviri anahtarının İngilizce karşılığı var', () => {
  const miss = allKeys().filter((k) => !I.has(k));
  assert.deepEqual(miss, []);
});

test('İngilizce: sonuç ekranı, rapor, yardım, öz-denetim adlarında Türkçe metin yok', () => {
  I.setLang('en');
  try {
    const st = { passed: 64, total: 64, failed: [], results: [] };
    let n = 0;
    for (const c of cases()) {
      const o = A.analyze(c.inp);
      const box = fake();
      LE.render.render(box, o, { formErrors: [], formWarnings: [] });
      const html = box.innerHTML + (o.ok ? LE.report.build(o, c.state, { reportId: 'LEA-1', selftest: st }) : '');
      const p = englishProblems(html);
      assert.deepEqual(p, [], 'giriş: ' + JSON.stringify(c.inp).slice(0, 300));
      n++;
    }
    assert.ok(n > 150);
    assert.deepEqual(englishProblems(LE.help.html({ passed: 64, total: 64 })), []);
    for (const v of LE.selftest.VECTORS) assert.deepEqual(englishProblems(I.X(v[0])), [], v[0]);
    // form: etiket, açıklama ve seçenekler
    for (const k of allKeys()) assert.deepEqual(englishProblems(I.T(k)), [], k);
    assert.deepEqual(I.missing().filter((k) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(k)), [], 'çalışırken karşılığı bulunmayan anahtar');
  } finally {
    I.setLang('tr');
  }
});

test('İngilizce: Amsler testi ekranları, rapor ve Hakkında Türkçe metin içermez', () => {
  const AM = LE.amsler;
  const bad = { id: 'r1', at: '2026-11-16T09:00:00.000Z', person: 'John Smith', event: '532 nm DPSS', R: ['0,0', '3,-4'], L: ['-1,0'], sym: ['blur', 'spot', 'after', 'pain'], cols: { R: 12, L: 12 }, rows: { R: 20, L: 20 }, source: 'card' };
  const ok = Object.assign({}, bad, { id: 'r2', at: '2026-11-17T09:00:00.000Z', R: [], L: [], sym: [], source: 'none' });
  I.setLang('en');
  try {
    const pages = {
      intro: AM.html.intro(), calib: AM.html.calib(), testR: AM.html.test('R'), testL: AM.html.test('L'),
      resultBad: AM.html.result(bad, null, true), resultOk: AM.html.result(ok, bad, false), resultUnsaved: AM.html.result(bad, ok, null),
      history: AM.html.history([ok, bad]), historyEmpty: AM.html.history([]), report: AM.html.report(bad, ok), reportOk: AM.html.report(ok, null), paper: AM.html.paper(),
      about: LE.about.html({ passed: 64, total: 64 }),
    };
    for (const [k, h] of Object.entries(pages)) assert.deepEqual(englishProblems(h), [], k);
    assert.deepEqual(I.missing().filter((k) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(k)), [], 'çalışırken karşılığı bulunmayan anahtar');
  } finally {
    I.setLang('tr');
  }
});

test('hesap sonuçları dilden bağımsız; Türkçe görünüm varsayılan', () => {
  const inp = { lambda: 532, mode: 'rp', Q: 1e-3, tau: 7e-9, f: 1e4, T: 0.25, beam: gauss(2e-3, 1e-3), range: 5, scint: { on: true, factor: 10 } };
  const a = A.analyze(inp);
  I.setLang('en');
  let b;
  try { b = A.analyze(inp); } finally { I.setLang('tr'); }
  for (const k of ['nohd', 'odWorst', 'odAtRange']) assert.equal(b.eye[k], a.eye[k], k);
  assert.equal(b.eye.scint.nohd, a.eye.scint.nohd);
  assert.equal(b.eyewear.marking, a.eyewear.marking);
  assert.equal(LE.units.fmt(1.5), '1,5', 'Türkçe ondalık virgül geri geldi');
  const box = fake();
  LE.render.render(box, a, { formErrors: [], formWarnings: [] });
  assert.match(box.innerHTML, /Doğrudan ışına bakış göz için TEHLİKELİ/);
});

test('İngilizce sayı yazımı: ondalık nokta, yüzde sonda, saat "h"', () => {
  I.setLang('en');
  try {
    assert.equal(LE.units.fmt(1.5), '1.5');
    assert.equal(LE.units.fmtOD(3.0089), '3.01');
    assert.equal(LE.units.fmtPct(0.9), '90%');
    assert.match(LE.units.fmtTime(10805), /^10\s805 s \(3 h\)$/);
    assert.match(LE.units.fmtTime(10974), /\(3\.05 h\)$/);
    assert.equal(I.X('C_P × 18·C_E·t^0,75 J/m²'), 'C_P × 18·C_E·t^0.75 J/m²');
  } finally {
    I.setLang('tr');
  }
});
