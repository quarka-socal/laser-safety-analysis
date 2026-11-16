#!/usr/bin/env node
'use strict';
/*
 * Tek dosyalık sürüm üretir: dist/LazerEmniyet.html
 * Tüm CSS ve JS satır içine alınır; dosya tek başına kopyalanıp (USB, e-posta)
 * herhangi bir modern tarayıcıda çevrimdışı açılabilir.
 *   node tools/build-single.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  const css = fs.readFileSync(path.join(root, href), 'utf8');
  return '<style>\n' + css + '\n</style>';
});

html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const js = fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script>/* ' + src + ' */\n' + js + '\n</script>';
});

if (/<script src=|<link rel="stylesheet"/.test(html)) {
  console.error('Satır içine alınamayan kaynak kaldı.');
  process.exit(1);
}

// motor sürümü ve derleme zamanı
global.LE = undefined;
require(path.join(root, 'js', 'core', 'analysis.js'));
const ver = globalThis.LE.analysis.ENGINE_VERSION;
html = html.replace('<head>', '<head>\n  <!-- Lazer Emniyet Analizi, motor v' + ver + ', tek dosya derlemesi ' + new Date().toISOString() + ' -->');

const out = path.join(root, 'dist', 'LazerEmniyet.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Yazıldı: ' + path.relative(process.cwd(), out) + ' (' + Math.round(html.length / 1024) + ' kB)');
