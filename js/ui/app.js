/*
 * Lazer Emniyet — uygulama denetleyicisi
 */
(function (root) {
  'use strict';
  const LE = root.LE;
  const U = LE.units;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => LE.render.esc(s);

  let selftest = { passed: 0, total: 0, failed: [], results: [] };
  let lastOut = null;
  let currentId = null;
  let timer = null;
  let sortKey = 'name';
  let sortDir = 1;

  function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), ms || 2600);
  }

  function label(id) {
    const f = LE.form.FIELDS[id];
    return f ? f.label : id;
  }

  // ---------------------------------------------------------------------------
  function init() {
    try {
      selftest = LE.selftest.runAll();
    } catch (e) {
      selftest = { passed: 0, total: 1, failed: [{ name: 'Öz-denetim çalıştırılamadı', error: String(e) }], results: [] };
    }
    const b = $('selftest');
    const ok = selftest.passed === selftest.total;
    b.textContent = (ok ? '✓ ' : '✗ ') + 'Öz-denetim ' + selftest.passed + '/' + selftest.total;
    b.classList.toggle('fail', !ok);
    if (!ok) {
      const bn = $('selftest-banner');
      bn.textContent = 'UYARI: Hesap motoru öz-denetimi başarısız (' + selftest.failed.length + ' test). Program dosyaları değişmiş veya bozulmuş olabilir — sonuçları güvenlik kararı için KULLANMAYIN.';
      bn.classList.remove('hidden');
    }
    b.addEventListener('click', showSelftest);

    LE.form.build($('inputs'), schedule);
    const ses = LE.store.loadSession();
    if (ses) {
      LE.form.setState(ses);
      currentId = ses.currentId || null;
    }
    buildExamples();
    wire();
    recalc();
    if (!LE.store.isPersistent()) toast('Tarayıcı yerel deposu kullanılamıyor: kayıtlar oturum kapanınca kaybolur. JSON dışa aktarmayı kullanın.', 6000);
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
      out = { ok: false, errors: ['Beklenmeyen hata: ' + e.message] };
      if (root.console) console.error(e);
    }
    lastOut = out && out.ok ? out : null;
    try {
      LE.render.render($('results'), out || { ok: false, errors: [] }, { formErrors, formWarnings });
    } catch (e) {
      lastOut = null;
      $('results').innerHTML = '<div class="verdict err"><h2>Hesap yapılamadı</h2><p>Beklenmeyen gösterim hatası: ' + esc(e.message) + '</p></div>';
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
    const modeTxt = { cw: 'Sürekli', sp: 'Tek darbe', rp: 'Tekrarlı' }[g('mode')];
    let pw = '';
    if (out && out.ok) pw = out.derived.P !== null ? U.fmtPrefixed(out.derived.P, 'W', 3) : U.fmtPrefixed(out.derived.Q, 'J', 3);
    LE.form.sectionHint('laser', (Number.isFinite(inp.lambda) ? U.fmt(inp.lambda, 5) + ' nm · ' : '') + modeTxt + (pw ? ' · ' + pw : ''));
    if (Number.isFinite(inp.beam.dx)) LE.form.sectionHint('beam', U.fmt(inp.beam.dx * 1e3, 3) + ' mm · ' + U.fmt(inp.beam.phix * 1e3, 3) + ' mrad (1/e)');
    const oavNA = g('oav') && inp.lambda > 0 && !(inp.lambda >= LE.analysis.OAV_MIN_NM && inp.lambda < LE.analysis.OAV_MAX_NM);
    LE.form.sectionHint('optics', (g('oav') ? (oavNA ? 'Dürbün bu λ\'da uygulanmaz' : 'Dürbün açık') : 'Dürbün yok') + (g('scint') ? ' · türbülans +1 OD' : '') + (inp.mu > 0 ? ' · μ = ' + U.fmt(inp.mu * 1e3, 3) + ' 1/km' : ''));
    LE.form.sectionHint('diffuse', out && out.ok && out.diffuse ? 'NHZ ' + LE.render.distOrNone(out.diffuse.eye.nhz, out.diffuse.eye.inf) : (g('dr_on') ? '' : 'kapalı'));
    const lf = [];
    if (out && out.ok && out.lens) lf.push('Mercek ' + LE.render.distOrNone(out.lens.nohd, out.lens.inf));
    if (out && out.ok && out.fiber) lf.push('Fiber ' + LE.render.distOrNone(out.fiber.nohd, out.fiber.inf));
    LE.form.sectionHint('lensfiber', lf.join(' · '));
    LE.form.sectionHint('skinew', out && out.ok && out.eyewear ? out.eyewear.marking : '');
    LE.form.sectionHint('ident', (g('name') || '') + (currentId ? ' · kayıtlı' : ''));
  }

  // ---------------------------------------------------------------------------
  function wire() {
    $('btn-new').addEventListener('click', () => {
      if (!confirm('Form varsayılan değerlere sıfırlansın mı? (Kaydedilmemiş değişiklikler kaybolur.)')) return;
      LE.form.setState(LE.form.defaultState());
      currentId = null;
      recalc();
      toast('Yeni analiz');
    });
    $('btn-save').addEventListener('click', saveRecord);
    $('btn-inventory').addEventListener('click', openInventory);
    $('btn-report').addEventListener('click', openReport);
    $('btn-help').addEventListener('click', () => {
      $('help-body').innerHTML = LE.help.html(selftest);
      $('dlg-help').showModal();
    });
    const exBtn = $('btn-examples');
    const exMenu = $('menu-examples');
    exBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = exMenu.classList.toggle('hidden') === false;
      exBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if (!exMenu.contains(e.target)) { exMenu.classList.add('hidden'); exBtn.setAttribute('aria-expanded', 'false'); }
    });
    for (const btn of document.querySelectorAll('[data-close]')) {
      btn.addEventListener('click', () => btn.closest('dialog').close());
    }
    $('inv-search').addEventListener('input', renderInventory);
    $('inv-export').addEventListener('click', () => {
      const list = LE.store.loadInventory();
      if (!list.length) return toast('Envanter boş.');
      LE.store.exportJSON(list);
    });
    $('inv-csv').addEventListener('click', () => {
      const list = LE.store.loadInventory();
      if (!list.length) return toast('Envanter boş.');
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
          toast('İçe aktarıldı: ' + r.added + ' yeni, ' + r.updated + ' güncellendi' + (r.skipped ? ', ' + r.skipped + ' geçersiz kayıt atlandı' : '') + '.', 4000);
          renderInventory();
        } catch (err) {
          alert('İçe aktarılamadı: ' + err.message);
        }
        e.target.value = '';
      };
      rd.readAsText(file);
    });
    $('rep-print').addEventListener('click', () => {
      $('report-print').innerHTML = $('rep-body').innerHTML;
      // Android uygulamasında window.print() çalışmaz: yerel köprü sistem yazdırma (PDF) ekranını açar
      const bridge = root.LazerAndroid;
      if (bridge && typeof bridge.print === 'function') bridge.print('Lazer tehlike analizi - ' + (LE.form.get('name') || 'adsız lazer'));
      else root.print();
    });
    $('rep-html').addEventListener('click', () => {
      const name = (LE.form.get('name') || 'lazer').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
      LE.store.download('rapor-' + name + '.html', LE.report.standaloneHTML($('rep-body').innerHTML, 'Lazer tehlike analizi raporu'), 'text/html;charset=utf-8');
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRecord(); }
    });
  }

  function buildExamples() {
    const m = $('menu-examples');
    m.innerHTML = '';
    LE.examples.forEach((ex, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.innerHTML = esc(ex.title) + '<small>' + esc(ex.desc) + '</small>';
      b.addEventListener('click', () => {
        loadExample(i);
        m.classList.add('hidden');
      });
      m.appendChild(b);
    });
  }

  function loadExample(i) {
    const ex = LE.examples[i];
    const s = LE.form.defaultState();
    Object.assign(s.v, ex.v);
    Object.assign(s.u, ex.u || {});
    LE.form.setState(s);
    currentId = null;
    recalc();
    toast('Örnek yüklendi: ' + ex.title + ' — değerleri kendi cihazınızla değiştirin.');
  }

  // ---------------------------------------------------------------------------
  function saveRecord() {
    const st = LE.form.getState();
    if (!String(st.v.name || '').trim()) {
      const sec = $('sec-ident');
      sec.open = true;
      const inp = $('in-name');
      inp.focus();
      toast('Kaydetmek için "Lazer tanımı" alanını doldurun.');
      return;
    }
    if (!lastOut) {
      if (!confirm('Analizde hata var; kayıt sonuç özeti olmadan saklanacak. Devam edilsin mi?')) return;
    }
    let id = currentId;
    const list = LE.store.loadInventory();
    if (id && list.some((r) => r.id === id)) {
      if (!confirm('Bu analiz envanterde kayıtlı. Mevcut kayıt güncellensin mi?\n(İptal = yeni kayıt olarak ekle)')) id = null;
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
    toast(r.ok ? 'Envantere kaydedildi: ' + st.v.name : 'Kaydedildi (yalnız bu oturum için — tarayıcı deposu kullanılamıyor).');
  }

  function openInventory() {
    renderInventory();
    $('dlg-inventory').showModal();
  }

  function renderInventory() {
    const q = $('inv-search').value.trim().toLocaleLowerCase('tr');
    let list = LE.store.loadInventory();
    if (q) {
      list = list.filter((r) => Object.values(r.summary || {}).join(' ').toLocaleLowerCase('tr').indexOf(q) >= 0);
    }
    const key = sortKey;
    list.sort((a, b) => {
      const x = (a.summary || {})[key];
      const y = (b.summary || {})[key];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sortDir;
      return String(x === undefined ? '' : x).localeCompare(String(y === undefined ? '' : y), 'tr') * sortDir;
    });
    const cols = [['name', 'Tanım'], ['maker', 'Üretici / model'], ['serial', 'Seri no'], ['cls', 'Sınıf'], ['loc', 'Konum'], ['wl', 'λ (nm)'], ['nohd', 'NOHD'], ['odWorst', 'OD'], ['marking', 'EN 207'], ['date', 'Tarih']];
    const body = $('inv-body');
    if (!LE.store.loadInventory().length) {
      body.innerHTML = '<p class="muted">Envanter boş. Bir analizi "Kaydet" düğmesiyle (Ctrl+S) ekleyin ya da daha önce dışa aktarılmış bir JSON dosyasını içe aktarın.</p>';
      return;
    }
    const head = cols.map(([k, t]) => '<th><button class="minibtn" data-sort="' + k + '">' + t + (sortKey === k ? (sortDir > 0 ? ' ▲' : ' ▼') : '') + '</button></th>').join('') + '<th></th>';
    const rows = list.map((r) => {
      const s = r.summary || {};
      const nohd = s.nohd === 'inf' ? '∞' : (typeof s.nohd === 'number' ? (s.nohd > 0 ? U.fmtDist(s.nohd) : 'yok') : '—');
      return '<tr' + (r.id === currentId ? ' class="gov"' : '') + '><td>' + esc(s.name) + '</td><td>' + esc([s.maker, s.modelNo].filter(Boolean).join(' / ')) + '</td><td>' + esc(s.serial) + '</td><td>' + esc(s.cls) + '</td><td>' + esc(s.loc) + '</td>' +
        '<td class="num">' + (typeof s.wl === 'number' ? U.fmt(s.wl, 5) : '') + '</td><td class="num">' + nohd + '</td><td class="num">' + (typeof s.odWorst === 'number' ? U.fmtOD(s.odWorst) : '—') + '</td><td class="mono">' + esc(s.marking || '') + '</td><td>' + esc(s.date) + '</td>' +
        '<td style="white-space:nowrap"><button class="minibtn" data-open="' + esc(r.id) + '">Aç</button> <button class="minibtn" data-dup="' + esc(r.id) + '">Kopyala</button> <button class="minibtn" data-del="' + esc(r.id) + '">Sil</button></td></tr>';
    }).join('');
    body.innerHTML = '<p class="muted">' + list.length + ' kayıt' + (q ? ' (filtreli)' : '') + '. Kayıtlar bu bilgisayarda tarayıcı deposunda tutulur; düzenli olarak JSON dışa aktarın.</p>' +
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
        toast('Açıldı: ' + ((r.summary && r.summary.name) || r.id));
      });
    }
    for (const b of body.querySelectorAll('[data-dup]')) {
      b.addEventListener('click', () => {
        const r = LE.store.loadInventory().find((x) => x.id === b.dataset.dup);
        if (!r) return;
        LE.store.upsert(LE.store.duplicate(r));
        renderInventory();
      });
    }
    for (const b of body.querySelectorAll('[data-del]')) {
      b.addEventListener('click', () => {
        const r = LE.store.loadInventory().find((x) => x.id === b.dataset.del);
        if (!r) return;
        if (!confirm('"' + ((r.summary && r.summary.name) || r.id) + '" kaydı silinsin mi? Bu işlem geri alınamaz (önce JSON dışa aktarabilirsiniz).')) return;
        LE.store.remove(r.id);
        if (currentId === r.id) currentId = null;
        renderInventory();
      });
    }
  }

  function openReport() {
    if (!lastOut) {
      toast('Rapor için önce girişlerdeki hataları düzeltin.');
      return;
    }
    const st = LE.form.getState();
    const html = LE.report.build(lastOut, st, { reportId: LE.report.reportId({}), selftest });
    $('rep-body').innerHTML = html;
    $('dlg-report').showModal();
  }

  function showSelftest() {
    const rows = selftest.results.map((r) => '<tr class="' + (r.pass ? '' : 'over') + '"><td>' + (r.pass ? '✓' : '✗') + '</td><td>' + esc(r.name) + '</td><td class="num">' + esc(typeof r.expected === 'number' ? U.fmt(r.expected, 6) : r.expected) + '</td><td class="num r">' + esc(r.error ? r.error : (typeof r.actual === 'number' ? U.fmt(r.actual, 6) : r.actual)) + '</td></tr>').join('');
    $('st-body').innerHTML = '<p>Program her açılışta hesap motorunu, ICNIRP 2013 tablolarından elle hesaplanmış değerler ve yayımlanmış örneklerle (EasyHaz LSO örnek dosyaları, Lasermet ve diğer EN 207 örnekleri) karşılaştırır. ' +
      '<b>' + selftest.passed + '/' + selftest.total + '</b> test geçti.</p><div class="tablewrap"><table class="t"><thead><tr><th></th><th>Test</th><th>Beklenen</th><th>Hesaplanan</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    $('dlg-selftest').showModal();
  }

  /**
   * Geri tuşu (Android): açık diyaloğu ya da Örnekler menüsünü kapatır.
   * @returns {boolean} bir şey kapatıldıysa true; false ise uygulama kapanabilir.
   */
  function back() {
    const open = document.querySelector('dialog[open]');
    if (open) { open.close(); return true; }
    const m = $('menu-examples');
    if (m && !m.classList.contains('hidden')) {
      m.classList.add('hidden');
      $('btn-examples').setAttribute('aria-expanded', 'false');
      return true;
    }
    return false;
  }
  LE.app = { back };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
