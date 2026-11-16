/*
 * Lazer Emniyet — uygulama denetleyicisi
 */
(function (root) {
  'use strict';
  const LE = root.LE;
  const U = LE.units;
  const T = (s, ...a) => LE.i18n.T(s, ...a);
  const X = (s) => LE.i18n.X(s);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => LE.render.esc(s);

  let selftest = { passed: 0, total: 0, failed: [], results: [] };
  let lastOut = null;
  let currentId = null;
  let timer = null;
  let sortKey = 'name';
  let sortDir = 1;

  // ---------------------------------------------------------------------------
  // Görünüm ayarları: tema, dil, açıklamalar (bu cihazda saklanır)
  // ---------------------------------------------------------------------------
  const KEY_PREFS = 'lazerEmniyet.ayarlar.v1';
  const DEFAULT_PREFS = { theme: 'system', lang: 'tr', help: 'tap' };
  const CHOICES = { theme: ['system', 'light', 'dark'], lang: ['tr', 'en'], help: ['tap', 'always'] };

  function loadPrefs() {
    let p = {};
    try { p = JSON.parse(root.localStorage.getItem(KEY_PREFS) || '{}') || {}; } catch (e) { p = {}; }
    const out = Object.assign({}, DEFAULT_PREFS);
    for (const k in CHOICES) if (CHOICES[k].indexOf(p[k]) >= 0) out[k] = p[k];
    return out;
  }

  function savePrefs() {
    try { root.localStorage.setItem(KEY_PREFS, JSON.stringify(LE.prefs)); } catch (e) { /* yalnız bu oturum */ }
  }

  LE.prefs = loadPrefs();

  function isDark() {
    if (LE.prefs.theme === 'dark') return true;
    if (LE.prefs.theme === 'light') return false;
    return !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /** Statik metinler: data-i18n (metin), data-i18n-ph (placeholder), data-i18n-title, data-i18n-aria. */
  function translateStatic() {
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = T(el.getAttribute('data-i18n'));
    for (const el of document.querySelectorAll('[data-i18n-ph]')) el.setAttribute('placeholder', T(el.getAttribute('data-i18n-ph')));
    for (const el of document.querySelectorAll('[data-i18n-title]')) el.setAttribute('title', T(el.getAttribute('data-i18n-title')));
    for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', T(el.getAttribute('data-i18n-aria')));
    document.title = T('Lazer Emniyet Analizi');
    const ver = $('drawer-ver');
    if (ver) ver.textContent = T('Uygulama {0} · hesap motoru {1}', LE.APP_VERSION || '', LE.analysis.ENGINE_VERSION);
  }

  /** Ayarları uygular. first: açılışta (form henüz kurulmadı). */
  function applyPrefs(first) {
    const p = LE.prefs;
    const html = document.documentElement;
    if (p.theme === 'system') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', p.theme);
    html.lang = p.lang;
    LE.i18n.setLang(p.lang);
    document.body.classList.toggle('help-always', p.help === 'always');
    translateStatic();
    selftestBadge();
    syncSettingsDialog();
    if (!first) {
      const st = LE.form.getState();
      LE.form.build($('inputs'), schedule);
      LE.form.setState(st);
      buildExamples();
      recalc();
      if ($('dlg-inventory').open) renderInventory();
      if ($('dlg-help').open) $('help-body').innerHTML = LE.help.html(selftest);
      if ($('dlg-about').open) showAbout(true);
      if (LE.amsler) LE.amsler.refresh();
      if ($('dlg-selftest').open) showSelftest(true);
      if ($('dlg-report').open && lastOut) $('rep-body').innerHTML = LE.report.build(lastOut, LE.form.getState(), { reportId: LE.report.reportId({}), selftest });
    }
    // Android: durum çubuğu şeridi, gezinme çubuğu simgeleri ve yerel iletiler aynı tema/dile uyar
    const bridge = root.LazerAndroid;
    if (bridge && typeof bridge.setUi === 'function') {
      try { bridge.setUi(p.lang, isDark()); } catch (e) { /* eski kabuk */ }
    }
  }

  function syncSettingsDialog() {
    for (const b of document.querySelectorAll('#dlg-settings [data-pref]')) {
      b.setAttribute('aria-pressed', String(LE.prefs[b.dataset.pref] === b.dataset.val));
    }
  }

  // ---------------------------------------------------------------------------
  function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), ms || 2600);
  }

  function label(id) {
    const f = LE.form.FIELDS[id];
    return f ? T(f.label) : id;
  }

  function selftestBadge() {
    const b = $('selftest');
    if (!selftest.total) return;
    const ok = selftest.passed === selftest.total;
    // telefonda yalnız "✓ 64/64" görünür (.st-word gizlenir); tam metin başlıkta ve ekran okuyucuda
    b.innerHTML = (ok ? '✓' : '✗') + ' <span class="st-word">' + esc(T('Öz-denetim')) + ' </span>' + selftest.passed + '/' + selftest.total;
    b.setAttribute('aria-label', T('Öz-denetim {0}/{1}', selftest.passed, selftest.total));
    b.title = T('Hesap motoru öz-denetimi') + ': ' + selftest.passed + '/' + selftest.total;
    b.classList.toggle('fail', !ok);
    if (!ok) {
      const bn = $('selftest-banner');
      bn.textContent = T('UYARI: Hesap motoru öz-denetimi başarısız ({0} test). Program dosyaları değişmiş veya bozulmuş olabilir — sonuçları güvenlik kararı için KULLANMAYIN.', selftest.failed.length);
      bn.classList.remove('hidden');
    }
  }

  // ---------------------------------------------------------------------------
  function init() {
    try {
      selftest = LE.selftest.runAll();
    } catch (e) {
      selftest = { passed: 0, total: 1, failed: [{ name: 'Öz-denetim çalıştırılamadı', error: String(e) }], results: [] };
    }
    applyPrefs(true);
    $('selftest').addEventListener('click', () => showSelftest());

    LE.form.build($('inputs'), schedule);
    const ses = LE.store.loadSession();
    if (ses) {
      LE.form.setState(ses);
      currentId = ses.currentId || null;
    }
    buildExamples();
    wire();
    recalc();
    if (root.matchMedia) {
      const mq = root.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => { if (LE.prefs.theme === 'system') applyPrefs(true); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
    if (!LE.store.isPersistent()) toast(T('Tarayıcı yerel deposu kullanılamıyor: kayıtlar oturum kapanınca kaybolur. JSON dışa aktarmayı kullanın.'), 6000);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(recalc, 120);
  }

  function recalc() {
    // Hiçbir hata durumunda ekranda önceki girişin sonuçları kalmamalı: okuma, hesap ve çizimdeki
    // her istisna sonuç alanını hata kutusuyla değiştirir.
    let r = null;
    let out = null;
    let formErrors = [];
    let formWarnings = [];
    try {
      r = LE.form.read();
      formErrors = Object.keys(r.errs).map((id) => label(id) + ': ' + r.errs[id]);
      formWarnings = Object.keys(r.warns).map((id) => label(id) + ': ' + r.warns[id]);
      if (r.ok) out = LE.analysis.analyze(r.inp);
    } catch (e) {
      out = { ok: false, errors: [T('Beklenmeyen hata: {0}', e.message)] };
      if (root.console) console.error(e);
    }
    lastOut = out && out.ok ? out : null;
    try {
      LE.render.render($('results'), out || { ok: false, errors: [] }, { formErrors, formWarnings });
    } catch (e) {
      lastOut = null;
      $('results').innerHTML = '<div class="verdict err"><h2>' + T('Hesap yapılamadı') + '</h2><p>' + T('Beklenmeyen gösterim hatası: {0}', esc(e.message)) + '</p></div>';
      if (root.console) console.error(e);
    }
    if (r) {
      try { hints(r, lastOut); } catch (e) { if (root.console) console.error(e); }
    }
    const st = LE.form.getState();
    st.currentId = currentId;
    LE.store.saveSession(st);
  }

  function hints(r, out) {
    const g = LE.form.get;
    const inp = r.inp;
    const modeTxt = { cw: T('Sürekli'), sp: T('Tek darbe'), rp: T('Tekrarlı') }[g('mode')] || '';
    let pw = '';
    if (out && out.ok) pw = out.derived.P !== null ? U.fmtPrefixed(out.derived.P, 'W', 3) : U.fmtPrefixed(out.derived.Q, 'J', 3);
    LE.form.sectionHint('laser', (Number.isFinite(inp.lambda) ? U.fmt(inp.lambda, 5) + ' nm · ' : '') + modeTxt + (pw ? ' · ' + pw : ''));
    if (Number.isFinite(inp.beam.dx)) LE.form.sectionHint('beam', U.fmt(inp.beam.dx * 1e3, 3) + ' mm · ' + U.fmt(inp.beam.phix * 1e3, 3) + ' mrad (1/e)');
    const oavNA = g('oav') && inp.lambda > 0 && !(inp.lambda >= LE.analysis.OAV_MIN_NM && inp.lambda < LE.analysis.OAV_MAX_NM);
    LE.form.sectionHint('optics', (g('oav') ? (oavNA ? T('Dürbün bu λ\'da uygulanmaz') : T('Dürbün açık')) : T('Dürbün yok')) + (g('scint') ? T(' · türbülans +1 OD') : '') + (inp.mu > 0 ? ' · μ = ' + U.fmt(inp.mu * 1e3, 3) + ' 1/km' : ''));
    LE.form.sectionHint('diffuse', out && out.ok && out.diffuse ? 'NHZ ' + LE.render.distOrNone(out.diffuse.eye.nhz, out.diffuse.eye.inf) : (g('dr_on') ? '' : T('kapalı')));
    const lf = [];
    if (out && out.ok && out.lens) lf.push(T('Mercek {0}', LE.render.distOrNone(out.lens.nohd, out.lens.inf)));
    if (out && out.ok && out.fiber) lf.push(T('Fiber {0}', LE.render.distOrNone(out.fiber.nohd, out.fiber.inf)));
    LE.form.sectionHint('lensfiber', lf.join(' · '));
    LE.form.sectionHint('skinew', out && out.ok && out.eyewear ? out.eyewear.marking : '');
    LE.form.sectionHint('ident', (g('name') || '') + (currentId ? T(' · kayıtlı') : ''));
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // ☰ çekmece ve ⋮ menüsü
  // ---------------------------------------------------------------------------
  function openDrawer() {
    closeMore();
    const d = $('drawer');
    if (!d.open) d.showModal();
    $('btn-menu').setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    const d = $('drawer');
    if (d.open) d.close();
  }
  function setExamplesOpen(open) {
    $('menu-examples').classList.toggle('hidden', !open);
    $('btn-examples').setAttribute('aria-expanded', String(open));
  }
  function moreOpen() {
    return !$('menu-more').classList.contains('hidden');
  }
  function openMore() {
    $('menu-more').classList.remove('hidden');
    $('btn-more').setAttribute('aria-expanded', 'true');
    const first = $('menu-more').querySelector('button');
    if (first) first.focus();
  }
  function closeMore(focusButton) {
    if (!moreOpen()) return;
    $('menu-more').classList.add('hidden');
    $('btn-more').setAttribute('aria-expanded', 'false');
    if (focusButton) $('btn-more').focus();
  }

  function showAbout(refreshOnly) {
    $('about-body').innerHTML = LE.about.html(selftest);
    LE.about.attach($('about-body'));
    if (!refreshOnly) $('dlg-about').showModal();
  }

  function wireMenus() {
    const drawer = $('drawer');
    $('btn-menu').addEventListener('click', openDrawer);
    drawer.addEventListener('close', () => $('btn-menu').setAttribute('aria-expanded', 'false'));
    // çekmecenin dışına (karartılmış zemine) dokunmak kapatır
    drawer.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });
    // komutlar önce çekmeceyi kapatır (onay pencereleri ve diyaloglar çekmecenin üstünde kalmasın)
    for (const id of ['btn-new', 'btn-save', 'btn-inventory', 'btn-report', 'btn-amsler']) $(id).addEventListener('click', closeDrawer);
    $('btn-examples').addEventListener('click', () => setExamplesOpen($('menu-examples').classList.contains('hidden')));

    const more = $('menu-more');
    $('btn-more').addEventListener('click', (e) => {
      e.stopPropagation();
      if (moreOpen()) closeMore(); else openMore();
    });
    for (const b of more.querySelectorAll('button')) b.addEventListener('click', () => closeMore());
    document.addEventListener('click', (e) => {
      if (moreOpen() && !more.contains(e.target)) closeMore();
    });
    more.addEventListener('keydown', (e) => {
      const items = Array.from(more.querySelectorAll('button'));
      const i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); closeMore(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Tab') closeMore();
    });
    $('btn-about').addEventListener('click', () => showAbout());
    $('btn-amsler').addEventListener('click', () => LE.amsler.open());
  }

  function wire() {
    wireMenus();
    $('btn-new').addEventListener('click', () => {
      if (!confirm(T('Form varsayılan değerlere sıfırlansın mı? (Kaydedilmemiş değişiklikler kaybolur.)'))) return;
      LE.form.setState(LE.form.defaultState());
      currentId = null;
      recalc();
      toast(T('Yeni analiz'));
    });
    $('btn-save').addEventListener('click', saveRecord);
    $('btn-inventory').addEventListener('click', openInventory);
    $('btn-report').addEventListener('click', openReport);
    $('btn-help').addEventListener('click', () => {
      $('help-body').innerHTML = LE.help.html(selftest);
      $('dlg-help').showModal();
    });
    $('btn-settings').addEventListener('click', () => {
      syncSettingsDialog();
      $('dlg-settings').showModal();
    });
    for (const b of document.querySelectorAll('#dlg-settings [data-pref]')) {
      b.addEventListener('click', () => {
        if (LE.prefs[b.dataset.pref] === b.dataset.val) return;
        LE.prefs[b.dataset.pref] = b.dataset.val;
        savePrefs();
        applyPrefs(false);
      });
    }
    for (const btn of document.querySelectorAll('[data-close]')) {
      btn.addEventListener('click', () => btn.closest('dialog').close());
    }
    $('inv-search').addEventListener('input', renderInventory);
    $('inv-export').addEventListener('click', () => {
      const list = LE.store.loadInventory();
      if (!list.length) return toast(T('Envanter boş.'));
      LE.store.exportJSON(list);
    });
    $('inv-csv').addEventListener('click', () => {
      const list = LE.store.loadInventory();
      if (!list.length) return toast(T('Envanter boş.'));
      LE.store.exportCSV(list);
    });
    $('inv-import').addEventListener('click', () => $('inv-import-file').click());
    $('inv-import-file').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const r = LE.store.importJSON(String(rd.result));
          toast(r.skipped
            ? T('İçe aktarıldı: {0} yeni, {1} güncellendi, {2} geçersiz kayıt atlandı.', r.added, r.updated, r.skipped)
            : T('İçe aktarıldı: {0} yeni, {1} güncellendi.', r.added, r.updated), 4000);
          renderInventory();
        } catch (err) {
          alert(T('İçe aktarılamadı: {0}', err.message === 'Dosya biçimi tanınmadı (lazer-emniyet-envanter bekleniyor).' ? T(err.message) : err.message));
        }
        e.target.value = '';
      };
      rd.readAsText(file);
    });
    $('rep-print').addEventListener('click', () => {
      $('report-print').innerHTML = $('rep-body').innerHTML;
      // Android uygulamasında window.print() çalışmaz: yerel köprü sistem yazdırma (PDF) ekranını açar
      const bridge = root.LazerAndroid;
      if (bridge && typeof bridge.print === 'function') bridge.print(T('Lazer tehlike analizi - {0}', LE.form.get('name') || T('adsız lazer')));
      else root.print();
    });
    $('rep-html').addEventListener('click', () => {
      const name = (LE.form.get('name') || T('lazer')).replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
      LE.store.download(T('rapor-{0}.html', name), LE.report.standaloneHTML($('rep-body').innerHTML, T('Lazer tehlike analizi raporu')), 'text/html;charset=utf-8');
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRecord(); }
    });
  }

  /** Örneğin seçili dildeki metinleri (İngilizce karşılığı yoksa Türkçe). */
  function exText(ex) {
    return LE.prefs.lang === 'en' && ex.en ? ex.en : ex;
  }

  function buildExamples() {
    const m = $('menu-examples');
    m.innerHTML = '';
    LE.examples.forEach((ex, i) => {
      const t = exText(ex);
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = esc(t.title) + '<small>' + esc(t.desc) + '</small>';
      b.addEventListener('click', () => {
        closeDrawer();
        setExamplesOpen(false);
        loadExample(i);
      });
      m.appendChild(b);
    });
  }

  function loadExample(i) {
    const ex = LE.examples[i];
    const t = exText(ex);
    const s = LE.form.defaultState();
    Object.assign(s.v, ex.v);
    if (t.name) s.v.name = t.name;
    Object.assign(s.u, ex.u || {});
    LE.form.setState(s);
    currentId = null;
    recalc();
    toast(T('Örnek yüklendi: {0} — değerleri kendi cihazınızla değiştirin.', t.title));
  }

  // ---------------------------------------------------------------------------
  function saveRecord() {
    const st = LE.form.getState();
    if (!String(st.v.name || '').trim()) {
      const sec = $('sec-ident');
      sec.open = true;
      const inp = $('in-name');
      inp.focus();
      toast(T('Kaydetmek için "Lazer tanımı" alanını doldurun.'));
      return;
    }
    if (!lastOut) {
      if (!confirm(T('Analizde hata var; kayıt sonuç özeti olmadan saklanacak. Devam edilsin mi?'))) return;
    }
    let id = currentId;
    const list = LE.store.loadInventory();
    if (id && list.some((r) => r.id === id)) {
      if (!confirm(T('Bu analiz envanterde kayıtlı. Mevcut kayıt güncellensin mi?\n(İptal = yeni kayıt olarak ekle)'))) id = null;
    } else id = null;
    const rec = {
      id: id || LE.store.newId(),
      savedAt: new Date().toISOString(),
      engine: LE.analysis.ENGINE_VERSION,
      state: { v: st.v, u: st.u },
      summary: LE.store.summarize(st, lastOut),
    };
    const r = LE.store.upsert(rec);
    currentId = rec.id;
    recalc();
    toast(r.ok ? T('Envantere kaydedildi: {0}', st.v.name) : T('Kaydedildi (yalnız bu oturum için — tarayıcı deposu kullanılamıyor).'));
  }

  function openInventory() {
    renderInventory();
    $('dlg-inventory').showModal();
  }

  function renderInventory() {
    const loc = LE.prefs.lang === 'en' ? 'en' : 'tr';
    const q = $('inv-search').value.trim().toLocaleLowerCase(loc);
    let list = LE.store.loadInventory();
    if (q) {
      list = list.filter((r) => Object.values(r.summary || {}).join(' ').toLocaleLowerCase(loc).indexOf(q) >= 0);
    }
    const key = sortKey;
    list.sort((a, b) => {
      const x = (a.summary || {})[key];
      const y = (b.summary || {})[key];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sortDir;
      return String(x === undefined ? '' : x).localeCompare(String(y === undefined ? '' : y), loc) * sortDir;
    });
    const cols = [['name', T('Tanım')], ['maker', T('Üretici / model')], ['serial', T('Seri no')], ['cls', T('Sınıf')], ['loc', T('Konum')], ['wl', 'λ (nm)'], ['nohd', 'NOHD'], ['odWorst', 'OD'], ['marking', 'EN 207'], ['date', T('Tarih')]];
    const body = $('inv-body');
    if (!LE.store.loadInventory().length) {
      body.innerHTML = '<p class="muted">' + T('Envanter boş. Bir analizi ☰ menüsündeki "Envantere kaydet" ile (Ctrl+S) ekleyin ya da daha önce dışa aktarılmış bir JSON dosyasını içe aktarın.') + '</p>';
      return;
    }
    const head = cols.map(([k, t]) => '<th><button class="minibtn" data-sort="' + k + '">' + t + (sortKey === k ? (sortDir > 0 ? ' ▲' : ' ▼') : '') + '</button></th>').join('') + '<th></th>';
    const rows = list.map((r) => {
      const s = r.summary || {};
      const nohd = s.nohd === 'inf' ? '∞' : (typeof s.nohd === 'number' ? (s.nohd > 0 ? U.fmtDist(s.nohd) : T('yok')) : '—');
      return '<tr' + (r.id === currentId ? ' class="gov"' : '') + '><td>' + esc(s.name) + '</td><td>' + esc([s.maker, s.modelNo].filter(Boolean).join(' / ')) + '</td><td>' + esc(s.serial) + '</td><td>' + esc(s.cls) + '</td><td>' + esc(s.loc) + '</td>' +
        '<td class="num">' + (typeof s.wl === 'number' ? U.fmt(s.wl, 5) : '') + '</td><td class="num">' + nohd + '</td><td class="num">' + (typeof s.odWorst === 'number' ? U.fmtOD(s.odWorst) : '—') + '</td><td class="mono">' + esc(s.marking || '') + '</td><td>' + esc(s.date) + '</td>' +
        '<td style="white-space:nowrap"><button class="minibtn" data-open="' + esc(r.id) + '">' + T('Aç') + '</button> <button class="minibtn" data-dup="' + esc(r.id) + '">' + T('Kopyala') + '</button> <button class="minibtn" data-del="' + esc(r.id) + '">' + T('Sil') + '</button></td></tr>';
    }).join('');
    body.innerHTML = '<p class="muted">' + (q ? T('{0} kayıt (filtreli). Kayıtlar bu cihazda saklanır; düzenli olarak JSON dışa aktarın.', list.length) : T('{0} kayıt. Kayıtlar bu cihazda saklanır; düzenli olarak JSON dışa aktarın.', list.length)) + '</p>' +
      '<div class="tablewrap"><table class="t"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    for (const b of body.querySelectorAll('[data-sort]')) {
      b.addEventListener('click', () => {
        const k = b.dataset.sort;
        if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = 1; }
        renderInventory();
      });
    }
    for (const b of body.querySelectorAll('[data-open]')) {
      b.addEventListener('click', () => {
        const r = LE.store.loadInventory().find((x) => x.id === b.dataset.open);
        if (!r) return;
        LE.form.setState(r.state);
        currentId = r.id;
        recalc();
        $('dlg-inventory').close();
        toast(T('Açıldı: {0}', (r.summary && r.summary.name) || r.id));
      });
    }
    for (const b of body.querySelectorAll('[data-dup]')) {
      b.addEventListener('click', () => {
        const r = LE.store.loadInventory().find((x) => x.id === b.dataset.dup);
        if (!r) return;
        LE.store.upsert(LE.store.duplicate(r, T(' (kopya)')));
        renderInventory();
      });
    }
    for (const b of body.querySelectorAll('[data-del]')) {
      b.addEventListener('click', () => {
        const r = LE.store.loadInventory().find((x) => x.id === b.dataset.del);
        if (!r) return;
        if (!confirm(T('"{0}" kaydı silinsin mi? Bu işlem geri alınamaz (önce JSON dışa aktarabilirsiniz).', (r.summary && r.summary.name) || r.id))) return;
        LE.store.remove(r.id);
        if (currentId === r.id) currentId = null;
        renderInventory();
      });
    }
  }

  function openReport() {
    if (!lastOut) {
      toast(T('Rapor için önce girişlerdeki hataları düzeltin.'));
      return;
    }
    const st = LE.form.getState();
    const html = LE.report.build(lastOut, st, { reportId: LE.report.reportId({}), selftest });
    $('rep-body').innerHTML = html;
    $('dlg-report').showModal();
  }

  function showSelftest(refreshOnly) {
    const rows = selftest.results.map((r) => '<tr class="' + (r.pass ? '' : 'over') + '"><td>' + (r.pass ? '✓' : '✗') + '</td><td>' + esc(X(r.name)) + '</td><td class="num">' + esc(typeof r.expected === 'number' ? U.fmt(r.expected, 6) : r.expected) + '</td><td class="num r">' + esc(r.error ? r.error : (typeof r.actual === 'number' ? U.fmt(r.actual, 6) : r.actual)) + '</td></tr>').join('');
    $('st-body').innerHTML = '<p>' + T('Program her açılışta hesap motorunu, ICNIRP 2013 tablolarından elle hesaplanmış değerler ve yayımlanmış örneklerle (EasyHaz LSO örnek dosyaları, Lasermet ve diğer EN 207 örnekleri) karşılaştırır.') + ' ' +
      T('<b>{0}/{1}</b> test geçti.', selftest.passed, selftest.total) + '</p><div class="tablewrap"><table class="t"><thead><tr><th></th><th>' + T('Test') + '</th><th>' + T('Beklenen') + '</th><th>' + T('Hesaplanan') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    if (!refreshOnly) $('dlg-selftest').showModal();
  }

  /**
   * Geri tuşu (Android): Amsler testinde bir adım geri; yoksa en üstteki diyaloğu (çekmece dahil) ya da ⋮ menüsünü kapatır.
   * @returns {boolean} bir şey kapatıldıysa true; false ise uygulama kapanabilir.
   */
  function back() {
    if (LE.amsler && LE.amsler.isOpen()) return LE.amsler.back();
    const open = document.querySelectorAll('dialog[open]');
    if (open.length) { open[open.length - 1].close(); return true; }
    if (moreOpen()) { closeMore(); return true; }
    return false;
  }
  LE.app = { back, applyPrefs };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
