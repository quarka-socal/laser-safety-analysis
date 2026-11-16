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

test('üst çubuk tek satır: ☰ solda, başlık kısalabilir, öz-denetim ve ⋮ sağda; ⋮ menüsü ekran içinde', () => {
  const tb = decl('.topbar');
  assert.match(tb, /flex-wrap:\s*nowrap/);
  assert.match(tb, /position:\s*sticky/);
  assert.match(decl('.brand'), /min-width:\s*0/);
  assert.match(decl('.brand h1'), /text-overflow:\s*ellipsis/);
  const ml = decl('.menu-list');
  assert.match(ml, /right:\s*0/);
  assert.match(ml, /max-width:\s*calc\(100vw/);
  const m = media('max-width: 700px');
  assert.ok(!m || !decl('.menu-list', m), 'eski tam genişlik menü kuralı kalmamalı (⋮ menüsü sağa hizalı)');
  const head = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  const order = ['id="btn-menu"', 'class="brand"', 'id="selftest"', 'id="btn-more"'].map((s) => head.indexOf(s));
  assert.ok(order.every((i) => i >= 0), 'başlıkta ☰, marka, öz-denetim, ⋮');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'sıra: ☰ · marka · öz-denetim · ⋮');
  const n = media('max-width: 560px');
  assert.ok(n, 'telefon: 560 px medya sorgusu');
  assert.match(decl('.brand .std', n), /display:\s*none/);
});

test('menüler: ☰ çekmecesinde komutlar ve Amsler Grid testi; ⋮ menüsünde Yardım, Ayarlar, Hakkında', () => {
  const i = html.indexOf('<dialog id="drawer"');
  assert.ok(i >= 0, 'çekmece bir <dialog>');
  const drawer = html.slice(i, html.indexOf('</dialog>', i));
  for (const id of ['btn-new', 'btn-examples', 'menu-examples', 'btn-save', 'btn-inventory', 'btn-report', 'btn-amsler']) {
    assert.ok(drawer.includes('id="' + id + '"'), id);
  }
  const j = html.indexOf('id="menu-more"');
  const more = html.slice(j, html.indexOf('</header>'));
  assert.deepEqual([...more.matchAll(/id="(btn-[a-z]+)"/g)].map((m) => m[1]), ['btn-help', 'btn-settings', 'btn-about']);
  for (const id of ['dlg-about', 'dlg-amsler']) assert.match(html, new RegExp('<dialog id="' + id + '"'));
  const d = decl('dialog.drawer');
  assert.match(d, /margin:\s*0/);
  assert.match(d, /max-height:\s*100%/);
});

test('kapalı diyalog görünmez: diyaloğa display veren her kural [open] ile sınırlı', () => {
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!/display:\s*(flex|grid|block)/.test(m[2])) continue;
    for (const sel of m[1].split(',')) {
      const subject = sel.trim().split(/[\s>+~]+/).pop();
      // konu (en sağdaki basit seçici) diyaloğun kendisi mi: dialog…, #dlg-…, #drawer, .drawer (ama .drawer-head değil)
      if (/^(dialog(?![\w-])|#dlg-[\w-]+(?=$|[.[:#])|#drawer(?![\w-])|\.drawer(?![\w-]))/.test(subject)) {
        assert.match(subject, /\[open\]/, sel.trim());
      }
    }
  }
});

test('Amsler test ekranı: dokunma kaydırmaz, yakınlaştırmaz; ızgara seçilmez', () => {
  assert.match(decl('.am-test'), /touch-action:\s*none/);
  assert.match(decl('.am-grid'), /user-select:\s*none/);
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
