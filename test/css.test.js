'use strict';
/*
 * Stil sözleşmesi: dar ekran (telefon, Android) ve koyu tema hataları geri gelmesin.
 * Yerleşim tarayıcıda 375 px genişlikte ölçülerek doğrulandı; bu testler kuralları korur.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

/** Seçicinin (tam eşleşme) bildirimleri; medya bloğu verilirse onun içinde aranır. */
function decl(selector, scope) {
  const src = scope || css;
  const re = new RegExp('(?:^|[}\\s])' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm');
  const m = src.match(re);
  return m ? m[1] : null;
}
function media(cond) {
  const i = css.indexOf('@media (' + cond + ')');
  if (i < 0) return null;
  let depth = 0;
  for (let j = css.indexOf('{', i); j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}' && --depth === 0) return css.slice(i, j + 1);
  }
  return null;
}
function hex(v) {
  const m = /#([0-9a-f]{6})/i.exec(v);
  return m ? [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16) / 255) : null;
}
function lum(rgb) {
  const c = rgb.map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function vars(block) {
  const o = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*([^;]+);/g)) o[m[1]] = m[2].trim();
  return o;
}

test('dar ekran: diyalog başlığı sarar, arama kutusu ekranı taşırmaz', () => {
  assert.match(decl('.dlg-head'), /flex-wrap:\s*wrap/);
  const s = decl('.search');
  assert.doesNotMatch(s, /min-width:\s*2\d\dpx/);
  assert.match(s, /flex:/);
});

test('dar ekran: Örnekler menüsü ekran içinde, başlık yapışkan değil', () => {
  const m = media('max-width: 700px');
  assert.ok(m, '700 px medya sorgusu');
  assert.match(decl('.topbar', m), /position:\s*relative/);
  assert.match(decl('.menu', m), /position:\s*static/);
  const ml = decl('.menu-list', m);
  assert.match(ml, /left:\s*\d+px/);
  assert.match(ml, /right:\s*\d+px/);
  assert.match(ml, /min-width:\s*0/);
});

test('koyu ve açık temada vurgu rengi üstündeki yazı okunur (WCAG ≥ 4,5:1)', () => {
  const light = vars(decl(':root'));
  const darkMedia = vars(media('prefers-color-scheme: dark'));
  const darkAttr = vars(decl(':root[data-theme="dark"]'));
  for (const [name, v] of [['açık', light], ['koyu (sistem)', darkMedia], ['koyu (data-theme)', darkAttr]]) {
    assert.ok(v.accent && v['on-accent'], name + ': --accent ve --on-accent tanımlı');
    assert.ok(contrast(v.accent, v['on-accent']) >= 4.5, name + ' kontrast ' + contrast(v.accent, v['on-accent']).toFixed(2));
  }
  assert.match(decl('.seg button[aria-pressed="true"]'), /color:\s*var\(--on-accent\)/);
  assert.match(decl('.btn.primary'), /color:\s*var\(--on-accent\)/);
});

test('JSON içe aktarma klavyeyle erişilebilir bir düğme', () => {
  assert.doesNotMatch(html, /<label class="btn" for="inv-import-file">/);
  assert.match(html, /<button class="btn" id="inv-import"[^>]*>JSON içe aktar<\/button>/);
});
