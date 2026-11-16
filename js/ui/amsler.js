/*
 * Lazer Emniyet — Amsler Grid testi (sahada hızlı ilk göz kontrolü)
 * Copyright © 2026 S.ÖCAL — SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Standart ızgara (Amsler M. Br J Ophthalmol 1953;37:521–537, DOI 10.1136/bjo.37.9.521): 10 cm × 10 cm,
 * 20 × 20 kare, kare 5 mm; ~30 cm'den her kare ≈ 1°, toplam ≈ 20° merkezi görme alanı.
 * Ekranda da kareler gerçek 5 mm çizilir: ölçek Android ekran bilgisinden (xdpi/ydpi) ya da bir banka/kimlik
 * kartıyla (ID-1, 85,60 × 53,98 mm) yapılan ayardan gelir. Ekrana sığan çift sayıda kare gösterilir (merkez
 * noktası bir kesişimde kalır), en çok 20 × 20.
 * Lazer hasarı çoğunlukla merkezde kör nokta (skotom) yapar (Sakaguchi 2000, DOI 10.1016/s0002-9394(00)00547-x).
 * Testin duyarlılığı sınırlıdır (Crossland ve Rubin 2007, DOI 10.1136/bjo.2006.095315): normal sonuç hasarı dışlamaz.
 *
 * Hesap, kayıt ve ekran metinleri DOM'suzdur (Node testleri); etkileşim yalnız tarayıcıda kurulur.
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});
  const T = (s, ...a) => (LE.i18n ? LE.i18n.T(s, ...a) : s.replace(/\{(\d+)\}/g, (m, i) => a[i]));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (v, d) => (LE.units ? LE.units.fmt(v, d) : String(Math.round(v)));
  const pct = (f) => (LE.units ? LE.units.fmtPct(f, 2) : f * 100 + '%');
  /** Sabit sayı metni: Türkçede ondalık virgül. */
  const dec = (s) => (LE.i18n && LE.i18n.lang() === 'en' ? s : s.replace(/(\d)\.(\d)/g, '$1,$2'));

  const CELL_MM = 5; // standart Amsler karesi
  const DIST_MM = 300; // bakış mesafesi
  const MAX_CELLS = 20; // 10 cm × 10 cm
  const CENTER = 2; // merkez bölgesi: ±2 kare (≈ ±2°)
  const CARD_MM = [85.6, 53.98]; // ISO/IEC 7810 ID-1: banka kartı, T.C. kimlik kartı
  const CARD_R_MM = 3.18; // kart köşe yarıçapı
  const CSS_PX_PER_MM = 96 / 25.4; // tarayıcının varsayımı (fiziksel değil)
  const KEY_CAL = 'lazerEmniyet.amslerKalibrasyon.v1';
  const KEY_HIST = 'lazerEmniyet.amsler.v1';
  const MAX_HIST = 200;
  const CELL_RE = /^-?\d+,-?\d+$/;

  // ---------------------------------------------------------------------------
  // Hesap (DOM'suz)
  // ---------------------------------------------------------------------------

  /** Kenarı cellMm olan karenin distMm uzaklıktan gördüğü açı (derece). */
  function degPerCell(cellMm, distMm) {
    return (2 * Math.atan(cellMm / 2 / distMm) * 180) / Math.PI;
  }

  /** Karenin tam 1° gördüğü mesafe (mm). */
  function distanceForOneDegree(cellMm) {
    return cellMm / 2 / Math.tan(Math.PI / 360);
  }

  /**
   * Izgara yerleşimi: kullanılabilir alana (CSS px) gerçek 5 mm'lik kareler; merkez noktası bir kesişimde
   * kalsın diye her yönde çift sayıda kare (en az 2, en çok 20).
   * @param {number} wPx, hPx  kullanılabilir genişlik ve yükseklik (CSS px)
   * @param {number} sx, sy    CSS px / mm (yatay, dikey)
   */
  function layout(wPx, hPx, sx, sy) {
    const cw = CELL_MM * sx;
    const ch = CELL_MM * (sy || sx);
    const even = (n) => (Number.isFinite(n) ? Math.max(2, Math.min(MAX_CELLS, 2 * Math.floor(n / 2))) : 2);
    const cols = even(Math.floor(wPx / cw + 1e-9));
    const rows = even(Math.floor(hPx / ch + 1e-9));
    const deg = degPerCell(CELL_MM, DIST_MM);
    return { cols, rows, cw, ch, widthPx: cols * cw, heightPx: rows * ch, deg, degX: cols * deg, degY: rows * deg };
  }

  function store() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }
  function readJSON(key, def) {
    try {
      const s = store();
      const v = s && s.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) {
      return def;
    }
  }
  function writeJSON(key, val) {
    try {
      const s = store();
      if (!s) return false;
      s.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      return false;
    }
  }

  function dpr() {
    const d = Number(root.devicePixelRatio);
    return d > 0 ? d : 1;
  }

  /** Android kabuğunun bildirdiği fiziksel ekran yoğunluğu; geçersizse null. */
  function androidScreen() {
    const b = root.LazerAndroid;
    if (!b || typeof b.screenMetrics !== 'function') return null;
    try {
      const m = JSON.parse(b.screenMetrics());
      if (!m || !(m.xdpi >= 100 && m.xdpi <= 1000 && m.ydpi >= 100 && m.ydpi <= 1000)) return null;
      const diag = m.widthPixels > 0 && m.heightPixels > 0 ? Math.hypot(m.widthPixels / m.xdpi, m.heightPixels / m.ydpi) : NaN;
      // bazı cihazlar yoğunluğu yanlış bildirir: eksenler uyuşmuyorsa ya da ekran köşegeni telefon/tablet
      // aralığında değilse (3,5–14 inç) kartla doğrulama istenir
      const suspect = Math.abs(m.xdpi / m.ydpi - 1) > 0.05 || !(diag >= 3.5 && diag <= 14);
      return { m, diag, suspect };
    } catch (e) {
      return null;
    }
  }

  /**
   * Ekran ölçeği (CSS px / mm). Öncelik: 1) kartla yapılan ayar, 2) Android ekran bilgisi, 3) tarayıcı varsayımı.
   * @returns {{sx:number, sy:number, source:'card'|'android'|'none', dpi?:object, diag?:number, suspect?:boolean}}
   */
  function metrics() {
    const r = dpr();
    const cal = readJSON(KEY_CAL, null);
    if (cal && cal.dpmm > 0.5 && cal.dpmm < 200) return { sx: cal.dpmm / r, sy: cal.dpmm / r, source: 'card', at: cal.at };
    const a = androidScreen();
    if (a) return { sx: a.m.xdpi / 25.4 / r, sy: a.m.ydpi / 25.4 / r, source: 'android', dpi: a.m, diag: a.diag, suspect: a.suspect };
    return { sx: CSS_PX_PER_MM, sy: CSS_PX_PER_MM, source: 'none' };
  }

  /** Kartla ayar: CSS px/mm cihaz pikseli/mm olarak saklanır (tarayıcı yakınlaştırmasından bağımsız). */
  function saveCalibration(sxCss) {
    return writeJSON(KEY_CAL, { dpmm: sxCss * dpr(), at: new Date().toISOString() });
  }
  function clearCalibration() {
    try { const s = store(); if (s) s.removeItem(KEY_CAL); } catch (e) { /* depo yok */ }
  }

  function validRecord(r) {
    return !!(r && typeof r.id === 'string' && typeof r.at === 'string' && Array.isArray(r.R) && Array.isArray(r.L) &&
      r.R.every((c) => CELL_RE.test(c)) && r.L.every((c) => CELL_RE.test(c)));
  }

  /** Test geçmişi, yeniden eskiye. Bozuk kayıtlar atlanır. */
  function loadHistory() {
    const a = readJSON(KEY_HIST, []);
    if (!Array.isArray(a)) return [];
    return a.filter(validRecord)
      .map((r) => Object.assign({ person: '', event: '', sym: [], cols: { R: MAX_CELLS, L: MAX_CELLS }, rows: { R: MAX_CELLS, L: MAX_CELLS }, source: 'none' }, r))
      .sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0));
  }
  function saveRecord(rec) {
    const list = loadHistory().filter((r) => r.id !== rec.id);
    list.unshift(rec);
    return writeJSON(KEY_HIST, list.slice(0, MAX_HIST));
  }
  function removeRecord(id) {
    return writeJSON(KEY_HIST, loadHistory().filter((r) => r.id !== id));
  }

  function cellXY(c) {
    const [x, y] = c.split(',').map(Number);
    return [x, y];
  }

  /** Göz sonucu: işaretli kare sayısı; merkezdeki ±2 kare (≈ ±2°) tutulmuş mu. */
  function eyeSummary(cells) {
    const central = cells.some((c) => {
      const [x, y] = cellXY(c);
      return x >= -CENTER && x < CENTER && y >= -CENTER && y < CENTER;
    });
    return { n: cells.length, normal: cells.length === 0, central };
  }

  /** Test sonucu: işaretli kare ya da belirti varsa bulgu var. */
  function verdict(rec) {
    const R = eyeSummary(rec.R || []);
    const L = eyeSummary(rec.L || []);
    const sym = (rec.sym || []).length > 0;
    const marks = !R.normal || !L.normal;
    return { bad: marks || sym, marks, sym, central: R.central || L.central, R, L };
  }

  /** Önceki testte işaretli olmayan yeni kareler. */
  function newCells(cur, prev) {
    const p = new Set(prev || []);
    return (cur || []).filter((c) => !p.has(c));
  }

  /** Kişi adı karşılaştırması: boşluk, büyük/küçük harf ve İ/ı farkı gözetilmez. */
  function personKey(s) {
    return String(s || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr').replace(/ı/g, 'i');
  }

  /** Aynı kişinin bu testten önceki son testi. */
  function previousFor(rec, list) {
    const k = personKey(rec.person);
    if (!k) return null;
    return (list || loadHistory()).slice().sort((x, y) => (x.at < y.at ? 1 : -1))
      .find((r) => r.id !== rec.id && r.at < rec.at && personKey(r.person) === k) || null;
  }

  // ---------------------------------------------------------------------------
  // Çizimler (SVG metni; ekranda ve yazdırmada ortak)
  // ---------------------------------------------------------------------------

  /**
   * 20 × 20 kayıt ızgarası: test edilen alan beyaz, dışı gri; işaretli kareler kırmızı.
   * @param {object} o { cells: ['x,y'], cols, rows, size: CSS uzunluğu (örn. '80mm') }
   */
  function recordSVG(o) {
    const N = MAX_CELLS;
    const half = N / 2;
    const cols = o.cols || N;
    const rows = o.rows || N;
    const size = o.size || '80mm';
    const p = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + N + ' ' + N + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(T('Amsler ızgarası, {0} × {1} kare', cols, rows)) + '">'];
    p.push('<rect x="0" y="0" width="' + N + '" height="' + N + '" fill="#c8c8c8"/>');
    p.push('<rect x="' + (half - cols / 2) + '" y="' + (half - rows / 2) + '" width="' + cols + '" height="' + rows + '" fill="#fff"/>');
    for (const c of o.cells || []) {
      const [x, y] = cellXY(c);
      p.push('<rect x="' + (half + x) + '" y="' + (half + y) + '" width="1" height="1" fill="#e00" fill-opacity="0.6"/>');
    }
    for (let i = 0; i <= N; i++) {
      p.push('<line x1="' + i + '" y1="0" x2="' + i + '" y2="' + N + '" stroke="#000" stroke-width="0.05"/>');
      p.push('<line x1="0" y1="' + i + '" x2="' + N + '" y2="' + i + '" stroke="#000" stroke-width="0.05"/>');
    }
    p.push('<circle cx="' + half + '" cy="' + half + '" r="0.25" fill="#000"/></svg>');
    return p.join('');
  }

  /** Gerçek boyutlu kâğıt test: 100 mm × 100 mm, 20 × 20 kare, merkez noktası. */
  function paperSVG() {
    const p = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100mm" height="100mm">'];
    p.push('<rect x="0" y="0" width="100" height="100" fill="#fff"/>');
    for (let i = 0; i <= 20; i++) {
      const v = i * 5;
      const w = i === 0 || i === 20 ? 0.5 : 0.25;
      p.push('<line x1="' + v + '" y1="0" x2="' + v + '" y2="100" stroke="#000" stroke-width="' + w + '"/>');
      p.push('<line x1="0" y1="' + v + '" x2="100" y2="' + v + '" stroke="#000" stroke-width="' + w + '"/>');
    }
    p.push('<circle cx="50" cy="50" r="1.2" fill="#000"/></svg>');
    return p.join('');
  }

  /** 50 mm kontrol çizgisi (yazdırma ölçeğini doğrulamak için). */
  const RULER_50 = '<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="6mm" viewBox="0 0 50 6"><path d="M0.2 0v6M49.8 0v6M0 3h50" stroke="#000" stroke-width="0.4" fill="none"/></svg>';

  // ---------------------------------------------------------------------------
  // Metinler ve ekranlar (DOM'suz; Node testleri İngilizce çıktıyı denetler)
  // ---------------------------------------------------------------------------

  /** Biçim: TR 16.11.2026 09:05, EN 2026-11-16 09:05 (yerel saat). */
  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso || '');
    const p = (n) => String(n).padStart(2, '0');
    const en = LE.i18n && LE.i18n.lang() === 'en';
    const day = en ? d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) : p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
    return day + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function symptoms() {
    return [
      ['blur', T('Görme bulanık ya da azalmış')],
      ['spot', T('Görüş alanında leke ya da kör nokta')],
      ['after', T('Birkaç dakikada geçmeyen ardıl görüntü')],
      ['pain', T('Göz ağrısı, sulanma ya da ışığa hassasiyet')],
    ];
  }
  function symptomText(sym) {
    const s = new Set(sym || []);
    return symptoms().filter((x) => s.has(x[0])).map((x) => x[1]).join('; ');
  }

  function sourceText(m) {
    if (m.source === 'card') return T('Ekran ölçüsü kartla ayarlandı: kareler 5 mm.');
    if (m.source === 'android') {
      return T('Ekran ölçüsü Android ekran bilgisinden ({0} dpi): kareler 5 mm.', Math.round(m.dpi.xdpi)) + ' ' +
        (m.suspect ? T('Cihazın bildirdiği değer şüpheli; kartla ayarlayın.') : T('Bir kez kartla doğrulamanız önerilir.'));
    }
    return T('Ekran ölçüsü ayarlanmadı: kareler 5 mm olmayabilir. Testten önce kartla ayarlayın.');
  }
  function sourceShort(src) {
    return src === 'card' ? T('kartla ayarlandı') : src === 'android' ? T('Android ekran bilgisi') : T('ayarlanmadı');
  }

  function eyeText(cells) {
    const s = eyeSummary(cells || []);
    if (s.normal) return T('işaretli alan yok');
    return T('{0} kare işaretlendi', s.n) + (s.central ? ' — ' + T('merkezdeki ±2°\'lik alan dahil') : '');
  }
  function eyeLine(label, cells) {
    return '<b>' + label + ':</b> ' + eyeText(cells);
  }

  function more(html, summary) {
    return LE.render && LE.render.more ? LE.render.more(html, summary) : '<details class="more"><summary>' + summary + '</summary>' + html + '</details>';
  }

  const ui = { step: 'intro', eye: 'R', rec: null, viewing: null, saved: null, invert: false, person: '', event: '', sym: [], calSx: 0 };

  function screenSteps() {
    return [
      T('Gözlük ya da lens kullanıyorsanız takın (lazer koruyucu gözlüğü çıkarın). Ortam iyi aydınlatılmış olsun.'),
      T('Telefonu gözünüzden yaklaşık 30 cm uzakta tutun (bir A4 kâğıdın uzun kenarı kadar).'),
      T('Bir gözünüzü bastırmadan avucunuzla kapatın; açık gözünüzle yalnız ortadaki noktaya bakın.'),
      T('Gözünüzü noktadan ayırmadan: çizgiler düz mü, kareler eşit mi; eksik, bulanık ya da karanlık bir yer var mı?'),
      T('Bozuk görünen karelere dokunun (yeniden dokunmak işareti kaldırır; parmağınızı sürükleyerek birden çok kare işaretleyebilirsiniz). Sonra diğer göze geçin.'),
    ];
  }

  function refsHTML() {
    return '<ul class="am-refs">' +
      '<li>' + T('Standart ızgara: 10 cm × 10 cm, 20 × 20 kare, kare 5 mm; 30 cm\'den her kare ≈ 1° (tam 1° için 28,6 cm). Amsler M. Br J Ophthalmol 1953;37:521–537.') + '</li>' +
      '<li>' + T('Lazer hasarı çoğunlukla merkezde kör nokta (skotom) yapar; çizgilerde eğrilik olmayabilir. Sakaguchi H ve ark. Am J Ophthalmol 2000;130:355–356.') + '</li>' +
      '<li>' + T('Duyarlılık sınırlıdır (bazı çalışmalarda %50\'nin altında): beyin eksik alanı tamamlayabilir, bu yüzden normal sonuç hasarı dışlamaz. Crossland M, Rubin G. Br J Ophthalmol 2007;91:391–393.') + '</li>' +
      '<li>' + T('Ekranda gösterilen ızgara, kare boyu ve mesafe doğru olduğunda kâğıt testle uyumludur. Brucker J ve ark. Ophthalmol Ther 2019;8:461–476.') + '</li>' +
      '<li>' + T('Lazerle çalışanlar için bir temel (başlangıç) test kaydı önerilir; maruziyetten sonra aynı kişinin önceki testiyle karşılaştırılır.') + '</li>' +
      '</ul>';
  }

  function introHTML() {
    const m = metrics();
    const vw = Number(root.innerWidth) || 400;
    const vh = Number(root.innerHeight) || 760;
    const lay = layout(vw - 16, vh - 130, m.sx, m.sy);
    const n = loadHistory().length;
    const sym = symptoms().map(([k, label]) => '<label class="chk"><input type="checkbox" data-sym="' + k + '"' + (ui.sym.indexOf(k) >= 0 ? ' checked' : '') + '> ' + label + '</label>').join('');
    return '<div class="am-intro">' +
      '<p class="am-lead">' + T('Lazer maruziyeti şüphesinde (parlama, ardıl görüntü, görmede leke) merkezi görmeyi her göz için ayrı kontrol eder. Sahada hızlı bir ilk değerlendirmedir; tanı koymaz, göz muayenesinin yerini tutmaz.') + '</p>' +
      '<div class="am-fields">' +
      '<label>' + T('Kişi (ad soyad ya da sicil no)') + '<input id="am-person" autocomplete="off" value="' + esc(ui.person) + '"></label>' +
      '<label>' + T('Olay / lazer (isteğe bağlı)') + '<input id="am-event" autocomplete="off" value="' + esc(ui.event) + '"></label></div>' +
      '<fieldset class="am-sym"><legend>' + T('Belirtiler (varsa işaretleyin)') + '</legend>' + sym + '</fieldset>' +
      '<ol class="am-steps">' + screenSteps().map((s) => '<li>' + s + '</li>').join('') + '</ol>' +
      '<p class="am-cal' + (m.source === 'none' || m.suspect ? ' warn' : '') + '"><span>' + esc(sourceText(m)) + '</span> ' +
      '<button type="button" class="minibtn" id="am-calib">' + T('Kartla ayarla') + '</button></p>' +
      '<p class="muted am-field">' + T('Bu ekranda {0} × {1} kare (≈ {2}° × {3}°) gösterilir; standart kâğıt ızgara 20 × 20 karedir (≈ 19° × 19°). Telefonu yan çevirmek yatay alanı genişletir.', lay.cols, lay.rows, fmt(lay.degX, 2), fmt(lay.degY, 2)) + '</p>' +
      '<div class="seg am-colors" role="group" aria-label="' + esc(T('Izgara rengi')) + '">' +
      '<button type="button" data-inv="0" aria-pressed="' + !ui.invert + '">' + T('Siyah çizgi, beyaz zemin') + '</button>' +
      '<button type="button" data-inv="1" aria-pressed="' + ui.invert + '">' + T('Beyaz çizgi, siyah zemin') + '</button></div>' +
      '<div class="am-actions">' +
      '<button type="button" class="btn primary" id="am-start">' + T('Teste başla (önce sağ göz)') + '</button>' +
      '<button type="button" class="btn" id="am-history">' + T('Geçmiş testler ({0})', n) + '</button>' +
      '<button type="button" class="btn" id="am-paper">' + T('Kâğıt test yazdır (10 × 10 cm)') + '</button></div>' +
      '<p class="muted am-note">' + T('Test sırasında ekran açık kalır ve parlaklık en yükseğe çıkar (Android). Sonuçlar yalnız bu cihazda saklanır.') + '</p>' +
      more(refsHTML(), T('Yöntem ve kaynaklar')) +
      '</div>';
  }

  function calibHTML() {
    const sx = ui.calSx || metrics().sx;
    return '<div class="am-calib">' +
      '<p>' + T('Bir banka kartını ya da kimlik kartını (85,60 × 53,98 mm) ekrana yaslayın. Çerçeve kartın kenarlarıyla çakışana kadar ayarlayın.') + '</p>' +
      '<div class="am-cardwrap"><div class="am-card" id="am-card"><span>' + dec('85.60 × 53.98 mm') + '</span></div></div>' +
      '<div class="am-actions am-adj">' + [[0.98, '−', 0.02], [0.998, '−', 0.002], [1.002, '+', 0.002], [1.02, '+', 0.02]]
        .map(([k, sgn, f]) => '<button type="button" class="btn" data-k="' + k + '">' + sgn + pct(f) + '</button>').join('') + '</div>' +
      '<input type="range" id="am-range" min="2" max="16" step="0.005" value="' + sx + '" aria-label="' + esc(T('Ölçek')) + '">' +
      '<p class="muted">' + T('Cetvelle kontrol: aşağıdaki çizgi 50 mm olmalı.') + '</p>' +
      '<div class="am-ruler" id="am-ruler"></div>' +
      '<p class="muted" id="am-scale"></p>' +
      '<div class="am-actions"><button type="button" class="btn primary" id="am-cal-save">' + T('Kaydet') + '</button>' +
      '<button type="button" class="btn" id="am-cal-reset">' + T('Ayarı sil (cihaz değerine dön)') + '</button>' +
      '<button type="button" class="btn" id="am-back">' + T('Geri') + '</button></div></div>';
  }

  function testHTML(eye) {
    const right = eye !== 'L';
    return '<div class="am-test' + (ui.invert ? ' inv' : '') + '">' +
      '<div class="am-bar"><b class="am-eye">' + (right ? T('SAĞ GÖZ — sol gözünüzü kapatın') : T('SOL GÖZ — sağ gözünüzü kapatın')) + '</b>' +
      '<span class="am-hint">' + T('≈ 30 cm uzaktan ortadaki noktaya bakın; bozuk görünen karelere dokunun.') + '</span>' +
      '<button type="button" class="am-x" id="am-quit" aria-label="' + esc(T('Testi bırak')) + '" title="' + esc(T('Testi bırak')) + '">×</button></div>' +
      '<div class="am-zoom hidden" id="am-zoom" role="alert">' + T('Sayfa yakınlaştırılmış: kareler 5 mm değil. İki parmakla uzaklaştırın.') + '</div>' +
      '<div class="am-gridwrap" id="am-gridwrap"></div>' +
      '<div class="am-bar am-bottom"><span id="am-count" aria-live="polite"></span>' +
      '<button type="button" class="btn" id="am-clear">' + T('Temizle') + '</button>' +
      '<button type="button" class="btn primary" id="am-next">' + (right ? T('Sol göze geç') : T('Sonucu göster')) + '</button></div>' +
      '</div>';
  }

  /** saved: true = kaydedildi, false = kaydedilemedi, null = geçmişten açıldı. */
  function resultHTML(rec, prev, saved) {
    const v = verdict(rec);
    const grid = (eye) => '<figure><figcaption>' + (eye === 'R' ? T('Sağ göz') : T('Sol göz')) + '</figcaption>' +
      recordSVG({ cells: rec[eye], cols: rec.cols && rec.cols[eye], rows: rec.rows && rec.rows[eye], size: '100%' }) + '</figure>';
    let cmp = '';
    if (prev) {
      const nR = newCells(rec.R, prev.R).length;
      const nL = newCells(rec.L, prev.L).length;
      cmp = '<p>' + T('Önceki test ({0}): ', esc(fmtDate(prev.at))) + eyeLine(T('Sağ göz'), prev.R) + '; ' + eyeLine(T('Sol göz'), prev.L) + '.' +
        (nR || nL ? ' <b>' + T('Önceki teste göre yeni işaretli kare: sağ {0}, sol {1}.', nR, nL) + '</b>' : '') + '</p>';
    }
    const sym = symptomText(rec.sym);
    const meta = [T('Tarih: {0}', esc(fmtDate(rec.at)))];
    if (rec.person) meta.push(T('Kişi: {0}', esc(rec.person)));
    if (rec.event) meta.push(T('Olay: {0}', esc(rec.event)));
    meta.push(T('Ekran ölçüsü: {0}', sourceShort(rec.source)));
    const note = saved === true ? '<p class="muted">' + T('Sonuç bu cihazdaki test geçmişine kaydedildi.') + '</p>'
      : saved === false ? '<p class="am-cal warn">' + T('Sonuç kaydedilemedi (tarayıcı deposu kapalı); yazdırarak saklayın.') + '</p>' : '';
    return '<div class="am-result">' +
      '<div class="verdict ' + (v.bad ? 'danger' : 'ok') + '"><h2>' + (v.bad ? T('Bulgu var: göz hekimine başvurun') : T('Amsler testinde bulgu yok')) + '</h2>' +
      '<p>' + eyeLine(T('Sağ göz'), rec.R) + '</p><p>' + eyeLine(T('Sol göz'), rec.L) + '</p>' +
      (sym ? '<p><b>' + T('Belirtiler') + ':</b> ' + esc(sym) + '</p>' : '') +
      '<p>' + (v.bad
        ? T('Hemen (aynı gün) bir göz hekimine başvurun; retina muayenesi ve mümkünse OCT gerekir. Olayı lazer güvenlik sorumlusuna bildirin. Gözü ovuşturmayın, lazerle çalışmayı bırakın.')
        : T('Bu sonuç hasarı dışlamaz. Maruziyet şüphesi varsa en kısa sürede (en geç 48 saat içinde) göz muayenesi yaptırın. Görme azalırsa ya da leke, ardıl görüntü sürerse hemen başvurun. Testi birkaç saat sonra tekrarlayın.')) + '</p></div>' +
      cmp +
      '<div class="am-grids">' + grid('R') + grid('L') + '</div>' +
      '<p class="muted">' + T('Kırmızı: bozuk, eksik ya da karanlık görülen kareler. Gri: bu ekranda test edilmeyen alan.') + '</p>' +
      '<p class="muted">' + meta.join(' · ') + '</p>' + note +
      '<div class="am-actions"><button type="button" class="btn primary" id="am-print">' + T('Yazdır / PDF') + '</button>' +
      (saved === null ? '' : '<button type="button" class="btn" id="am-again">' + T('Yeni test') + '</button><button type="button" class="btn" id="am-history">' + T('Geçmiş testler') + '</button>') +
      '<button type="button" class="btn" id="am-back">' + T('Geri') + '</button></div></div>';
  }

  function historyHTML(list) {
    if (!list.length) {
      return '<p class="muted">' + T('Kayıtlı test yok.') + '</p><div class="am-actions"><button type="button" class="btn" id="am-back">' + T('Geri') + '</button></div>';
    }
    const rows = list.map((r) => {
      const v = verdict(r);
      const res = (v.bad ? '<b class="am-bad">' + T('Bulgu var') + '</b>' : T('Bulgu yok')) + '<br><small>' +
        T('sağ {0} · sol {1} kare', r.R.length, r.L.length) + (v.sym ? ' · ' + T('belirti') : '') + '</small>';
      return '<tr><td>' + esc(fmtDate(r.at)) + '</td><td>' + esc(r.person || '—') + '</td><td>' + esc(r.event || '') + '</td><td>' + res + '</td>' +
        '<td style="white-space:nowrap"><button type="button" class="minibtn" data-view="' + esc(r.id) + '">' + T('Aç') + '</button> ' +
        '<button type="button" class="minibtn" data-del="' + esc(r.id) + '">' + T('Sil') + '</button></td></tr>';
    }).join('');
    return '<div class="tablewrap"><table class="t"><thead><tr><th>' + T('Tarih') + '</th><th>' + T('Kişi') + '</th><th>' + T('Olay') + '</th><th>' + T('Sonuç') + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="muted">' + T('{0} test. Kayıtlar yalnız bu cihazda saklanır; belgelemek için sonucu yazdırın (PDF).', list.length) + '</p>' +
      '<div class="am-actions"><button type="button" class="btn" id="am-back">' + T('Geri') + '</button></div>';
  }

  /** A4 test raporu (yazdırma / PDF). */
  function reportHTML(rec, prev) {
    const v = verdict(rec);
    const cols = rec.cols || {};
    const rows = rec.rows || {};
    const g = (eye) => '<div style="text-align:center"><b>' + (eye === 'R' ? T('Sağ göz') : T('Sol göz')) + '</b><br>' +
      recordSVG({ cells: rec[eye], cols: cols[eye], rows: rows[eye], size: '80mm' }) + '</div>';
    const tr = [
      [T('Kişi'), esc(rec.person || '')],
      [T('Olay / lazer'), esc(rec.event || '')],
      [T('Tarih'), esc(fmtDate(rec.at))],
      [T('Belirtiler'), esc(symptomText(rec.sym) || T('yok'))],
      [T('Sağ göz'), eyeText(rec.R)],
      [T('Sol göz'), eyeText(rec.L)],
      [T('Test koşulu'), T('Kare 5 mm, bakış mesafesi ≈ 30 cm (kare ≈ 1°); test edilen alan: sağ {0} × {1}, sol {2} × {3} kare; ekran ölçüsü: {4}', cols.R || MAX_CELLS, rows.R || MAX_CELLS, cols.L || MAX_CELLS, rows.L || MAX_CELLS, sourceShort(rec.source))],
    ];
    if (prev) {
      const nR = newCells(rec.R, prev.R).length;
      const nL = newCells(rec.L, prev.L).length;
      tr.push([T('Önceki test'), esc(fmtDate(prev.at)) + ': ' + T('sağ {0} · sol {1} kare', prev.R.length, prev.L.length) + (nR || nL ? '; <b>' + T('yeni işaretli kare: sağ {0}, sol {1}', nR, nL) + '</b>' : '')]);
    }
    return '<div class="head"><div><h1>' + T('Amsler Grid testi') + '</h1><div>' + T('Sahada hızlı ilk göz kontrolü') + '</div></div>' +
      '<div style="text-align:right">' + T('Tarih: {0}', esc(fmtDate(rec.at))) + '</div></div>' +
      '<table><tbody>' + tr.map((r) => '<tr><th style="width:28%">' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</tbody></table>' +
      '<div class="verdictbox">' + (v.bad
        ? T('Bulgu var: hemen (aynı gün) göz hekimine başvurulmalı ve olay lazer güvenlik sorumlusuna bildirilmelidir.')
        : T('Bulgu yok. Bu sonuç hasarı dışlamaz; maruziyet şüphesinde en geç 48 saat içinde göz muayenesi önerilir.')) + '</div>' +
      '<div style="display:flex;gap:10mm;justify-content:center;margin:5mm 0">' + g('R') + g('L') + '</div>' +
      '<p style="font-size:9pt">' + T('Kırmızı: bozuk, eksik ya da karanlık görülen kareler. Gri: bu ekranda test edilmeyen alan (standart ızgara 20 × 20 kare).') + '</p>' +
      '<div class="sign"><div>' + T('Testi uygulayan') + '</div><div>' + T('Lazer güvenlik sorumlusu') + '</div></div>' +
      '<p class="disc">' + T('Amsler Grid testi tanı koymaz; duyarlılığı sınırlıdır ve normal sonuç hasarı dışlamaz. Kaynaklar: Amsler M. Br J Ophthalmol 1953;37:521–537 · Crossland M, Rubin G. Br J Ophthalmol 2007;91:391–393 · Sakaguchi H ve ark. Am J Ophthalmol 2000;130:355–356.') + ' ' +
      T('Yazılım: Lazer Emniyet Analizi{0}.', LE.APP_VERSION ? ' ' + esc(LE.APP_VERSION) : '') + '</p>';
  }

  /** Gerçek boyutlu boş ızgara (kâğıtla test). */
  function paperHTML() {
    return '<h1 style="text-align:center">' + T('Amsler Grid testi') + '</h1>' +
      '<p style="text-align:center">' + T('Standart ızgara: 10 cm × 10 cm, 20 × 20 kare, kare 5 mm') + '</p>' +
      '<div style="display:flex;justify-content:center;margin:5mm 0 3mm">' + paperSVG() + '</div>' +
      '<div style="display:flex;justify-content:center">' + RULER_50 + '</div>' +
      '<p style="text-align:center;font-size:9pt">' + T('Yazdırırken ölçeği %100 (gerçek boyut) seçin: ızgaranın kenarı 10 cm, yukarıdaki çizgi 5 cm olmalıdır.') + '</p>' +
      '<ol style="font-size:10.5pt">' +
      '<li>' + T('Gözlük ya da lens kullanıyorsanız takın; ortam iyi aydınlatılmış olsun.') + '</li>' +
      '<li>' + T('Kâğıdı gözünüzden yaklaşık 30 cm uzakta tutun.') + '</li>' +
      '<li>' + T('Bir gözünüzü bastırmadan avucunuzla kapatın; açık gözünüzle yalnız ortadaki noktaya bakın.') + '</li>' +
      '<li>' + T('Gözünüzü noktadan ayırmadan: çizgiler düz mü, kareler eşit mi; eksik, bulanık ya da karanlık bir yer var mı?') + '</li>' +
      '<li>' + T('Bozuk görünen yerleri kalemle işaretleyin, sonra diğer gözü test edin. Bulgu varsa hemen göz hekimine başvurun.') + '</li>' +
      '</ol>' +
      '<p class="disc">' + T('Amsler Grid testi tanı koymaz; duyarlılığı sınırlıdır ve normal sonuç hasarı dışlamaz. Kaynaklar: Amsler M. Br J Ophthalmol 1953;37:521–537 · Crossland M, Rubin G. Br J Ophthalmol 2007;91:391–393 · Sakaguchi H ve ark. Am J Ophthalmol 2000;130:355–356.') + '</p>';
  }

  // ---------------------------------------------------------------------------
  // Etkileşim (tarayıcı)
  // ---------------------------------------------------------------------------
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);

  /** Android: test sırasında ekran açık kalır, parlaklık en yüksek; test bitince eski hâli. */
  function testScreen(on) {
    const b = root.LazerAndroid;
    if (b && typeof b.testScreen === 'function') {
      try { b.testScreen(!!on); } catch (e) { /* eski kabuk */ }
    }
  }

  function isOpen() {
    const d = $('dlg-amsler');
    return !!(d && d.open);
  }

  function open() {
    const d = $('dlg-amsler');
    if (!d) return;
    ui.step = 'intro';
    ui.viewing = null;
    if (!d.open) d.showModal();
    render();
  }

  /** Android geri tuşu: sol göz → sağ göz, geçmişten açılan sonuç → geçmiş, diğer adımlar → giriş, giriş → kapat. */
  function back() {
    const d = $('dlg-amsler');
    if (!d || !d.open) return false;
    if (ui.step === 'L') { ui.eye = 'R'; ui.step = 'R'; render(); return true; }
    if (ui.step === 'result' && ui.viewing) { ui.viewing = null; ui.step = 'history'; render(); return true; }
    if (ui.step !== 'intro') { testScreen(false); ui.step = 'intro'; render(); return true; }
    d.close();
    return true;
  }

  function render() {
    const d = $('dlg-amsler');
    const body = $('amsler-body');
    if (!d || !body) return;
    d.classList.toggle('testing', ui.step === 'R' || ui.step === 'L');
    if (ui.step === 'intro') body.innerHTML = introHTML();
    else if (ui.step === 'calib') body.innerHTML = calibHTML();
    else if (ui.step === 'history') body.innerHTML = historyHTML(loadHistory());
    else if (ui.step === 'result') {
      const rec = ui.viewing || ui.rec;
      body.innerHTML = resultHTML(rec, previousFor(rec), ui.viewing ? null : ui.saved);
    } else body.innerHTML = testHTML(ui.eye);
    d.scrollTop = 0;
    body.scrollTop = 0;
    wire();
  }

  function on(id, fn) {
    const e = $(id);
    if (e) e.addEventListener('click', fn);
  }

  function toast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function startTest() {
    const id = 'A' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
    ui.rec = {
      id, at: new Date().toISOString(), person: ui.person.trim(), event: ui.event.trim(), sym: ui.sym.slice(),
      R: [], L: [], cols: { R: 0, L: 0 }, rows: { R: 0, L: 0 }, source: metrics().source, invert: ui.invert,
    };
    ui.viewing = null;
    ui.eye = 'R';
    ui.step = 'R';
    testScreen(true);
    render();
  }

  function finishTest() {
    testScreen(false);
    ui.saved = saveRecord(ui.rec);
    ui.viewing = null;
    ui.step = 'result';
    render();
    if (ui.saved) toast(T('Test kaydedildi.'));
  }

  function wire() {
    const body = $('amsler-body');
    if (ui.step === 'intro') {
      const p = $('am-person');
      const e = $('am-event');
      p.addEventListener('input', () => { ui.person = p.value; });
      e.addEventListener('input', () => { ui.event = e.value; });
      for (const c of body.querySelectorAll('[data-sym]')) {
        c.addEventListener('change', () => {
          ui.sym = Array.from(body.querySelectorAll('[data-sym]')).filter((x) => x.checked).map((x) => x.dataset.sym);
        });
      }
      for (const b of body.querySelectorAll('[data-inv]')) {
        b.addEventListener('click', () => {
          ui.invert = b.dataset.inv === '1';
          for (const x of body.querySelectorAll('[data-inv]')) x.setAttribute('aria-pressed', String(x === b));
        });
      }
      on('am-calib', () => { ui.calSx = metrics().sx; ui.step = 'calib'; render(); });
      on('am-history', () => { ui.step = 'history'; render(); });
      on('am-paper', () => printHTML(paperHTML(), T('Amsler ızgarası (10 × 10 cm)')));
      on('am-start', startTest);
    } else if (ui.step === 'R' || ui.step === 'L') {
      afterLayout(drawGrid);
      on('am-quit', () => { testScreen(false); ui.step = 'intro'; render(); });
      on('am-clear', () => { ui.rec[ui.eye] = []; drawGrid(); });
      on('am-next', () => {
        if (ui.eye === 'R') { ui.eye = 'L'; ui.step = 'L'; render(); } else finishTest();
      });
    } else if (ui.step === 'calib') {
      drawCard();
      const range = $('am-range');
      range.addEventListener('input', () => { ui.calSx = Number(range.value); drawCard(true); });
      for (const b of body.querySelectorAll('[data-k]')) b.addEventListener('click', () => { ui.calSx *= Number(b.dataset.k); drawCard(); });
      on('am-cal-save', () => { saveCalibration(ui.calSx); ui.step = 'intro'; render(); toast(T('Ekran ölçüsü kaydedildi.')); });
      on('am-cal-reset', () => { clearCalibration(); ui.step = 'intro'; render(); });
      on('am-back', () => { ui.step = 'intro'; render(); });
    } else if (ui.step === 'result') {
      on('am-print', () => {
        const rec = ui.viewing || ui.rec;
        printHTML(reportHTML(rec, previousFor(rec)), T('Amsler testi - {0}', rec.person || fmtDate(rec.at)));
      });
      on('am-again', () => { ui.step = 'intro'; render(); });
      on('am-history', () => { ui.step = 'history'; render(); });
      on('am-back', () => { const v = ui.viewing; ui.viewing = null; ui.step = v ? 'history' : 'intro'; render(); });
    } else if (ui.step === 'history') {
      for (const b of body.querySelectorAll('[data-view]')) {
        b.addEventListener('click', () => {
          ui.viewing = loadHistory().find((r) => r.id === b.dataset.view) || null;
          if (ui.viewing) { ui.step = 'result'; render(); }
        });
      }
      for (const b of body.querySelectorAll('[data-del]')) {
        b.addEventListener('click', () => {
          const r = loadHistory().find((x) => x.id === b.dataset.del);
          if (!r || !confirm(T('{0} tarihli test silinsin mi? Bu işlem geri alınamaz.', fmtDate(r.at) + (r.person ? ' (' + r.person + ')' : '')))) return;
          removeRecord(r.id);
          render();
        });
      }
      on('am-back', () => { ui.step = 'intro'; render(); });
    }
  }

  function afterLayout(fn) {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(fn));
    else setTimeout(fn, 30);
  }

  /** Kart çerçevesi: sığarsa yatay, telefonda dikey (kartın uzun kenarı ekranın boyuna). */
  function drawCard(fromRange) {
    const card = $('am-card');
    if (!card) return;
    const sx = ui.calSx;
    const wrap = card.parentElement;
    const room = (wrap && wrap.clientWidth) || Number(root.innerWidth) || 400;
    const landscape = CARD_MM[0] * sx <= room - 8;
    card.style.width = (landscape ? CARD_MM[0] : CARD_MM[1]) * sx + 'px';
    card.style.height = (landscape ? CARD_MM[1] : CARD_MM[0]) * sx + 'px';
    card.style.borderRadius = CARD_R_MM * sx + 'px';
    const ruler = $('am-ruler');
    if (ruler) ruler.style.width = 50 * sx + 'px';
    if (!fromRange) $('am-range').value = String(sx);
    $('am-scale').textContent = T('Ölçek: {0} CSS piksel/mm', fmt(sx, 4));
  }

  /** Test ızgarası: gerçek 5 mm kareler, dokunarak ya da sürükleyerek işaretleme. */
  function drawGrid() {
    const wrap = $('am-gridwrap');
    if (!wrap || !ui.rec) return;
    const m = metrics();
    const lay = layout(wrap.clientWidth - 8, wrap.clientHeight - 8, m.sx, m.sy);
    const eye = ui.eye;
    ui.rec.cols[eye] = lay.cols;
    ui.rec.rows[eye] = lay.rows;
    const NS = 'http://www.w3.org/2000/svg';
    const el = (name, attrs) => {
      const e = document.createElementNS(NS, name);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };
    const svg = el('svg', {
      width: lay.widthPx, height: lay.heightPx, viewBox: '0 0 ' + lay.cols + ' ' + lay.rows, class: 'am-grid', role: 'img',
      'aria-label': T('Amsler ızgarası, {0} × {1} kare', lay.cols, lay.rows),
    });
    const fg = ui.invert ? '#fff' : '#000';
    svg.appendChild(el('rect', { x: 0, y: 0, width: lay.cols, height: lay.rows, fill: ui.invert ? '#000' : '#fff' }));
    const marks = new Set(ui.rec[eye]);
    const layer = el('g', {});
    const cellRect = (c) => {
      const [x, y] = cellXY(c);
      const r = el('rect', { x: x + lay.cols / 2, y: y + lay.rows / 2, width: 1, height: 1, fill: '#e00', 'fill-opacity': 0.5 });
      r.dataset.c = c;
      return r;
    };
    for (const c of marks) layer.appendChild(cellRect(c));
    svg.appendChild(layer);
    // çizgi ≈ 0,25 mm (en az bir cihaz pikseli)
    const sw = Math.max(0.25 * m.sx, 1 / dpr()) / lay.cw;
    for (let i = 0; i <= lay.cols; i++) svg.appendChild(el('line', { x1: i, x2: i, y1: 0, y2: lay.rows, stroke: fg, 'stroke-width': sw }));
    for (let j = 0; j <= lay.rows; j++) svg.appendChild(el('line', { y1: j, y2: j, x1: 0, x2: lay.cols, stroke: fg, 'stroke-width': sw }));
    svg.appendChild(el('circle', { cx: lay.cols / 2, cy: lay.rows / 2, r: 1.1 / CELL_MM, fill: fg })); // ≈ 2,2 mm nokta
    wrap.innerHTML = '';
    wrap.appendChild(svg);

    const count = () => {
      const n = ui.rec[eye].length;
      const c = $('am-count');
      if (c) c.textContent = n ? T('{0} kare işaretli', n) : T('İşaret yok');
    };
    count();
    const cellAt = (cx, cy) => {
      const b = svg.getBoundingClientRect();
      const x = Math.floor(((cx - b.left) / b.width) * lay.cols) - lay.cols / 2;
      const y = Math.floor(((cy - b.top) / b.height) * lay.rows) - lay.rows / 2;
      if (x < -lay.cols / 2 || x >= lay.cols / 2 || y < -lay.rows / 2 || y >= lay.rows / 2) return null;
      return x + ',' + y;
    };
    const setCell = (c, onOff) => {
      if (onOff === marks.has(c)) return;
      if (onOff) { marks.add(c); layer.appendChild(cellRect(c)); }
      else { marks.delete(c); for (const r of layer.querySelectorAll('rect')) if (r.dataset.c === c) r.remove(); }
      ui.rec[eye] = Array.from(marks);
      count();
    };
    // dokunma: aç/kapat; sürükleme: ilk karedeki yeni duruma göre işaretler ya da siler
    let paint = null;
    let last = null;
    svg.addEventListener('pointerdown', (ev) => {
      const c = cellAt(ev.clientX, ev.clientY);
      if (!c) return;
      paint = !marks.has(c);
      last = [ev.clientX, ev.clientY];
      setCell(c, paint);
      try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* yok */ }
      ev.preventDefault();
    });
    svg.addEventListener('pointermove', (ev) => {
      if (paint === null) return;
      // hızlı sürüklemede olaylar seyrek gelir: önceki noktadan bu yana geçilen kareler de işaretlenir
      const step = lay.cw / 3;
      const n = Math.max(1, Math.ceil(Math.hypot(ev.clientX - last[0], ev.clientY - last[1]) / step));
      for (let i = 1; i <= n; i++) {
        const c = cellAt(last[0] + ((ev.clientX - last[0]) * i) / n, last[1] + ((ev.clientY - last[1]) * i) / n);
        if (c) setCell(c, paint);
      }
      last = [ev.clientX, ev.clientY];
    });
    const stop = () => { paint = null; };
    svg.addEventListener('pointerup', stop);
    svg.addEventListener('pointercancel', stop);
    checkZoom();
  }

  /** İki parmakla yakınlaştırılmış sayfada kareler 5 mm olmaz: uyarı göster. */
  function checkZoom() {
    const z = $('am-zoom');
    const vv = root.visualViewport;
    if (z) z.classList.toggle('hidden', !(vv && Math.abs(vv.scale - 1) > 0.02));
  }

  function printHTML(html, title) {
    const box = $('report-print');
    if (!box) return;
    box.innerHTML = html;
    const b = root.LazerAndroid;
    if (b && typeof b.print === 'function') b.print(title);
    else root.print();
  }

  /** Dil değişince açık ekranı yeniler (işaretler korunur). */
  function refresh() {
    if (isOpen()) render();
  }

  if (typeof document !== 'undefined' && root.addEventListener) {
    let t = null;
    root.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => { if (isOpen() && (ui.step === 'R' || ui.step === 'L')) drawGrid(); }, 120);
    });
    if (root.visualViewport) root.visualViewport.addEventListener('resize', checkZoom);
    const init = () => {
      const d = $('dlg-amsler');
      if (!d) return;
      d.addEventListener('close', () => {
        testScreen(false);
        d.classList.remove('testing');
        ui.step = 'intro';
        ui.viewing = null;
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  LE.amsler = {
    CELL_MM, DIST_MM, MAX_CELLS, CARD_MM,
    degPerCell, distanceForOneDegree, layout, metrics, saveCalibration, clearCalibration,
    loadHistory, saveRecord, removeRecord, eyeSummary, verdict, newCells, previousFor, recordSVG, paperSVG,
    html: { intro: introHTML, calib: calibHTML, test: testHTML, result: resultHTML, history: historyHTML, report: reportHTML, paper: paperHTML },
    open, back, isOpen, refresh,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
