/*
 * Lazer Emniyet — Hakkında: geliştirici, sürüm ve tarih, lisans (GNU GPL v3 ya da sonrası).
 * Copyright © 2026 S.ÖCAL — SPDX-License-Identifier: GPL-3.0-or-later
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});
  const T = (s, ...a) => (LE.i18n ? LE.i18n.T(s, ...a) : s.replace(/\{(\d+)\}/g, (m, i) => a[i]));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const COPYRIGHT_YEAR = '2026';
  const LOGO = '<svg width="44" height="40" viewBox="0 0 64 58" aria-hidden="true"><path d="M32 3 61 55H3Z" fill="#ffd400" stroke="#111" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="37" r="5" fill="#111"/><path d="M32 37 19 25M32 37l15-6M32 37l-2 12M32 37h-14" stroke="#111" stroke-width="3" stroke-linecap="round"/></svg>';

  const isEn = () => !!(LE.i18n && LE.i18n.lang() === 'en');

  /** '2026-11-16' → 16.11.2026 (Türkçe) / 2026-11-16 (İngilizce). */
  function fmtDay(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return '';
    return isEn() ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '.' + m[2] + '.' + m[1];
  }

  /** ISO zaman damgası → yerel tarih ve saat. */
  function fmtStamp(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return fmtDay(d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /** Android kabuğunun sürüm bilgisi (yalnız uygulamada). */
  function androidInfo() {
    const b = root.LazerAndroid;
    if (!b || typeof b.appInfo !== 'function') return null;
    try {
      const o = JSON.parse(b.appInfo());
      return o && typeof o === 'object' ? o : null;
    } catch (e) {
      return null;
    }
  }

  function html(selftest) {
    const st = selftest || { passed: 0, total: 0 };
    const A = LE.analysis;
    const author = LE.APP_AUTHOR || 'S.ÖCAL';
    const rows = [
      [T('Geliştirici'), '<b>' + esc(author) + '</b>'],
      [T('Uygulama sürümü'), esc(LE.APP_VERSION || '—')],
      [T('Sürüm tarihi'), esc(fmtDay(LE.APP_DATE) || '—')],
      [T('Hesap motoru'), esc(A ? A.ENGINE_VERSION : '—')],
      [T('Öz-denetim'), st.total ? esc(st.passed + '/' + st.total) + ' ' + (st.passed === st.total ? T('başarılı') : T('— BAŞARISIZ')) : '—'],
      [T('Derleme'), LE.BUILD_TIME ? esc(fmtStamp(LE.BUILD_TIME)) : T('kaynak dosyalardan çalışıyor')],
    ];
    const info = androidInfo();
    if (info) {
      rows.push([T('Android uygulaması'), esc(String(info.versionName || '') + (info.versionCode ? ' (' + info.versionCode + ')' : ''))]);
      rows.push([T('Cihaz'), esc([info.device, info.release ? 'Android ' + info.release + (info.sdk ? ' (API ' + info.sdk + ')' : '') : ''].filter(Boolean).join(' · '))]);
      if (info.webview) rows.push(['WebView', esc(info.webview)]);
    }
    rows.push([T('Lisans'), 'GNU GPL v3+ (' + esc(LE.APP_LICENSE || 'GPL-3.0-or-later') + ')']);
    return '<div class="about-head">' + LOGO + '<div><div class="about-name">' + T('Lazer Emniyet Analizi') + '</div>' +
      '<div class="muted">' + T('Lazer tehlike analizi: MPE, NOHD, OD, EN 207 / EN 208 göz koruyucu seçimi ve Amsler Grid testi') + '</div></div></div>' +
      '<table class="t about-t"><tbody>' + rows.map((r) => '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</tbody></table>' +
      '<h3>' + T('Lisans') + '</h3>' +
      '<p>Copyright © ' + COPYRIGHT_YEAR + ' ' + esc(author) + '</p>' +
      '<p>' + T('Bu program özgür yazılımdır: Özgür Yazılım Vakfı (Free Software Foundation) tarafından yayımlanan GNU Genel Kamu Lisansı\'nın 3. sürümü ya da (seçiminize bağlı olarak) daha sonraki herhangi bir sürümü koşulları altında yeniden dağıtabilir ve/veya değiştirebilirsiniz.') + '</p>' +
      '<p>' + T('Bu program yararlı olması umuduyla dağıtılmaktadır, ancak HİÇBİR GARANTİSİ YOKTUR; SATILABİLİRLİK ya da BELİRLİ BİR AMACA UYGUNLUK konusunda zımni garanti dahi verilmez. Ayrıntılar için GNU Genel Kamu Lisansı\'na bakın.') + '</p>' +
      '<p class="muted">' + T('Kaynak kodu (HTML/JS dosyaları ve Android kabuğu) aynı lisansla dağıtılır. Lisansın bağlayıcı metni aşağıdaki İngilizce metindir.') + '</p>' +
      '<details class="more" id="about-license"><summary>' + T('GNU Genel Kamu Lisansı, sürüm 3 — tam metin (İngilizce)') + '</summary><div class="license" lang="en"></div></details>' +
      '<h3>' + T('Not') + '</h3>' +
      '<p class="muted">' + T('Program harici kütüphane ve ağ bağlantısı kullanmaz; tüm hesaplar bu cihazda yapılır, kayıtlar bu cihazda saklanır. Sonuçlar girilen verilere dayanır ve yetkin bir lazer güvenlik sorumlusunun değerlendirmesinin yerine geçmez.') + '</p>';
  }

  /**
   * Ekranda okunur biçim: 72 sütuna göre kırılmış satırlar paragraf içinde birleştirilir (dar ekranda satır ortasından
   * kırılmasın). Metnin kendisi değişmez; LICENSE dosyasıyla aynı metin LE.LICENSE_TEXT'tedir.
   */
  function reflow(text) {
    return String(text || '').split(/\n[ \t]*\n/).map((p) => p.replace(/[ \t]*\n[ \t]*/g, ' ').trim()).filter(Boolean).join('\n\n');
  }

  /** Lisans metni ilk açılışta doldurulur (35 kB metin başlangıçta DOM'a eklenmez). */
  function attach(body) {
    const d = body && body.querySelector('#about-license');
    if (!d) return;
    d.addEventListener('toggle', () => {
      const box = d.querySelector('.license');
      if (d.open && box && !box.textContent) box.textContent = reflow(LE.LICENSE_TEXT);
    });
  }

  LE.about = { html, attach, reflow, fmtDay, androidInfo };
})(typeof globalThis !== 'undefined' ? globalThis : this);
