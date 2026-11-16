'use strict';
/*
 * Linux masaüstü kısayolu (tools/kisayol-kur.sh): uygulama menüsü girdisi, masaüstü kopyası, simge ve kaldırma.
 * Gerçek ev klasörüne dokunmaz: HOME, XDG_DATA_HOME ve masaüstü geçici klasöre yönlendirilir.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'tools', 'kisayol-kur.sh');
const ID = 'laser-safety-analysis';

test('masaüstü kısayolu: "Laser Safety Analysis" menüde ve masaüstünde, tek dosya sürümünü açar; kaldırılabilir', { skip: process.platform !== 'linux' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kisayol-'));
  const env = Object.assign({}, process.env, {
    HOME: tmp, XDG_DATA_HOME: path.join(tmp, 'share'), KISAYOL_MASAUSTU: path.join(tmp, 'Masaustu'), KISAYOL_GIO: '0',
  });
  try {
    fs.mkdirSync(env.KISAYOL_MASAUSTU);
    execFileSync('bash', [SCRIPT], { env, stdio: 'pipe' });
    const app = path.join(tmp, 'share', 'applications', ID + '.desktop');
    const desk = path.join(env.KISAYOL_MASAUSTU, ID + '.desktop');
    const icon = path.join(tmp, 'share', 'icons', 'hicolor', 'scalable', 'apps', ID + '.svg');
    const d = fs.readFileSync(app, 'utf8');
    assert.match(d, /^\[Desktop Entry\]\nType=Application\n/);
    assert.match(d, /^Name=Laser Safety Analysis$/m);
    assert.match(d, /^Terminal=false$/m);
    const html = path.join(ROOT, 'dist', 'LazerEmniyet.html');
    assert.ok(d.includes('\nExec=xdg-open "' + html.replace(/%/g, '%%') + '"\n'), 'Exec tek dosya sürümünü tırnak içinde açar');
    assert.ok(d.includes('\nIcon=' + icon + '\n'), 'simge mutlak yolla');
    assert.equal(fs.readFileSync(desk, 'utf8'), d, 'masaüstü kopyası aynı');
    assert.ok(fs.statSync(desk).mode & 0o100, 'masaüstü kopyası çalıştırılabilir');
    assert.equal(fs.readFileSync(icon, 'utf8'), fs.readFileSync(path.join(ROOT, 'tools', ID + '.svg'), 'utf8'));
    try {
      execFileSync('desktop-file-validate', [app], { stdio: 'pipe' });
    } catch (e) {
      if (e.code !== 'ENOENT') throw new Error('desktop-file-validate: ' + String(e.stdout || '') + String(e.stderr || ''));
    }
    execFileSync('bash', [SCRIPT], { env, stdio: 'pipe' }); // ikinci kez: üzerine yazar, hata vermez
    execFileSync('bash', [SCRIPT, '--kaldir'], { env, stdio: 'pipe' });
    for (const f of [app, desk, icon]) assert.ok(!fs.existsSync(f), 'kaldırıldı: ' + f);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('simge: uygulamadaki sarı uyarı üçgeni, kare SVG', () => {
  const svg = fs.readFileSync(path.join(ROOT, 'tools', ID + '.svg'), 'utf8');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64"/);
  assert.match(svg, /fill="#ffd400"/);
});
