#!/usr/bin/env node
'use strict';
/*
 * Tek dosyalık sürüm üretir: dist/LazerEmniyet.html (ya da ilk argümandaki yol)
 * Tüm CSS ve JS satır içine alınır; dosya tek başına kopyalanıp (USB, e-posta)
 * herhangi bir modern tarayıcıda çevrimdışı açılabilir.
 *   node tools/build-single.js [çıktı.html]
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const built = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  const css = fs.readFileSync(path.join(root, href), 'utf8');
  return '<style>\n' + css + '\n</style>';
});

let stamped = 0;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  let js = fs.readFileSync(path.join(root, src), 'utf8');
  if (src === 'js/ui/version.js') {
    js = js.replace('/*BUILD_TIME*/ null', () => { stamped++; return "'" + built + "'"; });
  }
  js = js.replace(/<\/script/gi, '<\\/script');
  return '<script>/* ' + src + ' */\n' + js + '\n</script>';
});

if (/<script src=|<link rel="stylesheet"/.test(html)) {
  console.error('Satır içine alınamayan kaynak kaldı.');
  process.exit(1);
}
if (stamped !== 1) {
  console.error('Derleme zamanı yazılamadı (js/ui/version.js içinde /*BUILD_TIME*/ null bulunmalı).');
  process.exit(1);
}

// uygulama ve motor sürümü, derleme zamanı (Android derlemesi bu satırı denetler)
global.LE = undefined;
require(path.join(root, 'js', 'core', 'analysis.js'));
require(path.join(root, 'js', 'ui', 'version.js'));
const ver = globalThis.LE.analysis.ENGINE_VERSION;
const app = globalThis.LE.APP_VERSION;
html = html.replace('<head>', '<head>\n  <!-- Lazer Emniyet Analizi ' + app + ', motor v' + ver + ', tek dosya derlemesi ' + built + ' -->');

const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'dist', 'LazerEmniyet.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Yazıldı: ' + path.relative(process.cwd(), out) + ' (' + Math.round(html.length / 1024) + ' kB)');
