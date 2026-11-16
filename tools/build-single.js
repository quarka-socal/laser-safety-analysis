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
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const built = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n?/g, '\n');
// kaynak sürümün politikası ('self' + dosyalar) tek dosyaya taşınmaz; aşağıda gömülü betiklerin özetleriyle yenisi yazılır
html = html.replace(/\n?[ \t]*<!-- İçerik Güvenlik Politikası \(kaynak sürüm\)[\s\S]*?-->/, '');
html = html.replace(/\n?[ \t]*<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
if (html.includes('Content-Security-Policy')) {
  console.error('index.html içindeki CSP kaldırılamadı.');
  process.exit(1);
}

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
// İçerik Güvenlik Politikası: yalnız bu dosyadaki betikler (SHA-256 özetleriyle) çalışır; ağ bağlantısı, çerçeve,
// eklenti ve form gönderimi yoktur. Bir metin kaçışsız basılsa bile içindeki betik ya da olay işleyicisi çalışmaz.
html = html.replace(/\r\n?/g, '\n'); // tarayıcı da CR LF'yi LF'ye çevirerek özet alır
const hashes = [...new Set([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => "'sha256-" + crypto.createHash('sha256').update(m[1], 'utf8').digest('base64') + "'"))];
const csp = [
  "default-src 'none'", 'script-src ' + hashes.join(' '), "style-src 'unsafe-inline'", 'img-src data:',
  "connect-src 'none'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'",
].join('; ');
if (!html.includes('<meta charset="utf-8">')) {
  console.error('index.html içinde <meta charset="utf-8"> bulunamadı (CSP onun hemen ardına yazılır).');
  process.exit(1);
}
html = html.replace('<meta charset="utf-8">', () => '<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="' + csp + '">');

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
