'use strict';
/*
 * Hakkında, lisans (GNU GPL v3 ya da sonrası), sürüm bilgisi, Android adı ve köprüsü, tek dosya derlemesi.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { LE } = require('./helpers');
const ROOT = path.join(__dirname, '..');
const UI = path.join(ROOT, 'js', 'ui');
for (const m of ['version', 'i18n', 'lang_en', 'license', 'about', 'help']) require(path.join(UI, m + '.js'));

test('sürüm: uygulama 1.5.2, sürüm tarihi ISO biçiminde, derleme zamanı kaynakta boş', () => {
  assert.equal(LE.APP_VERSION, '1.5.2');
  assert.match(LE.APP_DATE, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(LE.BUILD_TIME, null);
});

test('Hakkında: geliştirici S.OCAL, GNU GPL v3 (ya da sonrası), sürüm, tarih ve motor', () => {
  const h = LE.about.html({ passed: 64, total: 64 });
  assert.equal(LE.APP_AUTHOR, 'S.OCAL');
  assert.match(h, /<b>S\.OCAL<\/b>/);
  assert.match(h, /Copyright © 20\d\d S\.OCAL/);
  assert.doesNotMatch(h, /ÖCAL/);
  assert.match(h, /GNU Genel Kamu Lisansı/);
  assert.match(h, /3\. sürümü ya da/);
  assert.match(h, /GPL-3\.0-or-later/);
  assert.ok(h.includes('1.5.2'));
  assert.ok(h.includes(LE.APP_DATE.split('-').reverse().join('.')), 'Türkçe tarih GG.AA.YYYY');
  assert.ok(h.includes(LE.analysis.ENGINE_VERSION));
  assert.match(h, /64\/64/);
  assert.match(h, /kaynak dosyalardan/, 'kaynaktan çalışırken derleme zamanı yok');
});

test('Hakkında (Android): uygulama sürüm kodu, Android ve WebView sürümü köprüden', () => {
  globalThis.LazerAndroid = { appInfo: () => JSON.stringify({ versionName: '1.5.0', versionCode: 10500, release: '15', sdk: 35, device: 'Google sdk_gphone64', webview: '124.0.6367.219' }) };
  try {
    const h = LE.about.html({ passed: 64, total: 64 });
    assert.match(h, /1\.5\.0 \(10500\)/);
    assert.match(h, /Android 15 \(API 35\)/);
    assert.match(h, /124\.0\.6367\.219/);
  } finally {
    delete globalThis.LazerAndroid;
  }
  globalThis.LazerAndroid = { appInfo: () => 'bozuk' };
  try {
    assert.doesNotThrow(() => LE.about.html({ passed: 64, total: 64 }));
  } finally {
    delete globalThis.LazerAndroid;
  }
});

test('Hakkında İngilizce: resmî GPL bildirimi, tarih YYYY-AA-GG', () => {
  LE.i18n.setLang('en');
  try {
    const h = LE.about.html({ passed: 64, total: 64 });
    assert.match(h, /This program is free software: you can redistribute it and\/or modify/);
    assert.match(h, /WITHOUT ANY WARRANTY/);
    assert.ok(h.includes(LE.APP_DATE));
    const text = h.replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /[çğıöşüÇĞİÖŞÜ]/);
  } finally {
    LE.i18n.setLang('tr');
  }
});

test('lisans: LICENSE dosyası GPL-3 tam metni; uygulamadaki metin aynı; package.json GPL-3.0-or-later', () => {
  const lic = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
  assert.match(lic, /^\s*GNU GENERAL PUBLIC LICENSE\n\s*Version 3, 29 June 2007\n/);
  assert.match(lic, /END OF TERMS AND CONDITIONS/);
  assert.ok(lic.length > 34000);
  assert.equal(LE.LICENSE_TEXT, lic);
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).license, 'GPL-3.0-or-later');
});

test('Android: uygulama adı "Laser Safety Analysis"; köprüde ekran ölçüsü, test ekranı ve sürüm bilgisi', () => {
  const strings = fs.readFileSync(path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'), 'utf8');
  assert.match(strings, /<string name="app_name">Laser Safety Analysis<\/string>/);
  const kt = fs.readFileSync(path.join(ROOT, 'android', 'app', 'src', 'main', 'java', 'com', 'quarka', 'lazeremniyet', 'MainActivity.kt'), 'utf8');
  for (const fn of ['saveFile', 'setUi', 'print', 'screenMetrics', 'testScreen', 'appInfo']) {
    assert.match(kt, new RegExp('@JavascriptInterface\\s+fun ' + fn + '\\('), fn);
  }
  assert.match(kt, /FLAG_KEEP_SCREEN_ON/);
});

test('tek dosya derlemesi: dış kaynak yok, derleme zamanı ve sürüm başlığı yazılır, lisans metni içeride', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lazer-emniyet-'));
  const out = path.join(dir, 'LazerEmniyet.html');
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-single.js'), out], { stdio: 'pipe' });
    const html = fs.readFileSync(out, 'utf8');
    assert.match(html, /<!-- Lazer Emniyet Analizi 1\.5\.2, motor v\d+\.\d+\.\d+, tek dosya derlemesi \d{4}-/);
    assert.match(html, /LE\.BUILD_TIME = '\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/);
    assert.doesNotMatch(html, /<script src=|<link rel="stylesheet"/);
    assert.match(html, /GNU GENERAL PUBLIC LICENSE/);
    assert.match(html, /LE\.amsler = /);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('lisans ekranda paragraflara göre akar; sözcükler ve paragraf sayısı korunur', () => {
  const t = LE.LICENSE_TEXT;
  const r = LE.about.reflow(t);
  const words = (s) => s.split(/\s+/).filter(Boolean);
  assert.deepEqual(words(r), words(t), 'aynı sözcükler aynı sırada');
  assert.equal(r.split('\n\n').length, t.split(/\n[ \t]*\n/).filter((p) => p.trim()).length);
  assert.ok(!/[^\n]\n[^\n]/.test(r), 'paragraf içinde satır kırılması kalmadı');
  assert.match(r, /^GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007\n\n/);
});

test('kaynak dosyalardaki telif satırları ve yardım metni: geliştirici S.OCAL, veriler "bu cihazda"', () => {
  for (const f of ['js/ui/version.js', 'js/ui/about.js', 'js/ui/amsler.js', 'android/app/src/main/java/com/quarka/lazeremniyet/MainActivity.kt', 'OKUBENI.md']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(src, /ÖCAL/, f);
  }
  const help = LE.help.html({ passed: 64, total: 64 });
  assert.match(help, /veriler yalnız bu cihazda saklanır/);
  assert.doesNotMatch(help, /bilgisayar/);
});
