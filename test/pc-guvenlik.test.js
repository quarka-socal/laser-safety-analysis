'use strict';
/*
 * PC güvenlik sözleşmesi (siber güvenlik incelemesi, 16.11.2026):
 *  - Kaynak sürüm (index.html) de İçerik Güvenlik Politikasıyla açılır; tek dosya sürümünde yalnız derlemenin politikası kalır
 *  - EasyHaz doğrulama aracı LibreOffice'e TCP portu açmaz: kullanıcıya özel boru, özel profil, iş bitince kapatma, makro yok
 *  - Masaüstü kısayolu kurulumu yoldaki denetim karakterlerini (satır sonu vb.) reddeder: .desktop dosyasına satır sızamaz
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

/** Sayfanın kendi CSP meta etiketleri (betiklerin içindeki metinler, ör. kaydedilen raporun politikası, sayılmaz). */
function cspOf(html) {
  const markup = html.replace(/<script>[\s\S]*?<\/script>/g, (m) => ' '.repeat(m.length));
  const metas = [...markup.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/g)];
  return { count: metas.length, raw: metas[0] && metas[0][1], index: metas[0] ? html.indexOf(metas[0][0]) : -1 };
}
function directives(raw) {
  return Object.fromEntries(raw.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const p = d.split(/\s+/); return [p[0], p.slice(1)]; }));
}
const sha = (s) => "'sha256-" + crypto.createHash('sha256').update(s, 'utf8').digest('base64') + "'";

test('kaynak sürüm (index.html) İçerik Güvenlik Politikasıyla açılır: yalnız kendi dosyaları ve özetli satır içi betik', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const c = cspOf(html);
  assert.equal(c.count, 1, 'tek CSP meta etiketi');
  assert.ok(c.index < html.indexOf('<script') && c.index < html.indexOf('<link rel="stylesheet"'), 'CSP ilk betikten ve stil dosyasından önce');
  const d = directives(c.raw);
  assert.deepEqual(d['default-src'], ["'none'"]);
  for (const k of ['connect-src', 'frame-src', 'object-src', 'base-uri', 'form-action']) assert.deepEqual(d[k], ["'none'"], k);
  assert.ok(d['script-src'].includes("'self'"));
  assert.ok(!d['script-src'].includes("'unsafe-inline'") && !d['script-src'].includes("'unsafe-eval'"));
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(inline.length >= 1);
  for (const s of inline) assert.ok(d['script-src'].includes(sha(s)), 'satır içi betiğin özeti CSP\'de yok (betik değiştiyse özeti güncelleyin)');
  assert.ok(d['style-src'].includes("'self'"));
});

test('tek dosya sürümünde yalnız derlemenin politikası kalır (kaynak sürümün politikası taşınmaz)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lazer-pc-'));
  try {
    const out = path.join(dir, 'x.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-single.js'), out], { stdio: 'pipe' });
    const html = fs.readFileSync(out, 'utf8');
    const c = cspOf(html);
    assert.equal(c.count, 1, 'tek CSP meta etiketi');
    const d = directives(c.raw);
    assert.ok(!d['script-src'].includes("'self'"), "tek dosyada 'self' gereksiz");
    assert.ok(!d['script-src'].includes('file:'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('EasyHaz doğrulama aracı: TCP portu yok; özel boru, özel profil, iş bitince kapatma, makrolar kapalı', () => {
  const py = fs.readFileSync(path.join(ROOT, 'tools', 'easyhaz_oracle.py'), 'utf8');
  assert.doesNotMatch(py, /socket,host|port=\d/, 'yerel TCP dinleyici yok');
  assert.match(py, /pipe,name=/);
  assert.match(py, /secrets\.token_hex/, 'boru adı tahmin edilemez');
  assert.match(py, /UserInstallation/, 'özel LibreOffice profili');
  assert.match(py, /mkdtemp/);
  assert.match(py, /finally:/);
  assert.match(py, /\.terminate\(\)/, 'iş bitince LibreOffice kapanır');
  assert.match(py, /pv\('MacroExecutionMode', 0\)/, 'makrolar asla çalışmaz');
  assert.match(py, /pv\('ReadOnly', True\)/);
  assert.match(py, /pv\('Hidden', True\)/);
});

test('masaüstü kısayolu: yolda satır sonu gibi denetim karakteri varsa kurulum reddedilir', { skip: process.platform !== 'linux' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kisayol-ctl-'));
  try {
    const proj = path.join(tmp, 'Lazer\nExec=sh -c kotu');
    for (const f of ['tools/kisayol-kur.sh', 'tools/laser-safety-analysis.svg', 'dist/LazerEmniyet.html']) {
      fs.mkdirSync(path.dirname(path.join(proj, f)), { recursive: true });
      fs.copyFileSync(path.join(ROOT, f), path.join(proj, f));
    }
    const env = Object.assign({}, process.env, { HOME: tmp, XDG_DATA_HOME: path.join(tmp, 'share'), KISAYOL_MASAUSTU: path.join(tmp, 'Masaustu'), KISAYOL_GIO: '0' });
    fs.mkdirSync(env.KISAYOL_MASAUSTU);
    const r = spawnSync('bash', [path.join(proj, 'tools', 'kisayol-kur.sh')], { env, encoding: 'utf8' });
    assert.notEqual(r.status, 0, 'kurulum reddedilmeli');
    assert.ok(!fs.existsSync(path.join(tmp, 'share', 'applications', 'laser-safety-analysis.desktop')), '.desktop yazılmamalı');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
