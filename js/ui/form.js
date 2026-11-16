/*
 * Lazer Emniyet — giriş formu (alan tanımları, oluşturma, okuma, doğrulama)
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});
  const U = LE.units;
  const T = (s, ...a) => (LE.i18n ? LE.i18n.T(s, ...a) : s.replace(/\{(\d+)\}/g, (m, i) => a[i]));
  const X = (s) => (LE.i18n ? LE.i18n.X(s) : s);

  const UL = {
    wavelength: ['nm', 'µm'],
    power: ['W', 'mW', 'µW', 'kW'],
    energy: ['J', 'mJ', 'µJ', 'nJ'],
    tau: ['s', 'ms', 'µs', 'ns', 'ps', 'fs'],
    texp: ['s', 'dk', 'sa', 'ms'],
    frequency: ['Hz', 'kHz', 'MHz', 'GHz'],
    diameter: ['mm', 'µm', 'cm', 'm'],
    angle: ['mrad', 'µrad', 'rad', '°'],
    distance: ['m', 'cm', 'mm', 'km'],
    atten: ['1/km', '1/m', '1/cm'],
  };
  const KIND = { tau: 'time', texp: 'time' };

  const isMode = (...m) => (g) => m.indexOf(g('mode')) >= 0;

  /** Alan tanımları. min/max SI birimindedir. */
  const SECTIONS = [
    {
      id: 'laser', title: 'Lazer parametreleri', open: false,
      fields: [
        { id: 'limits', type: 'select', label: 'Sınır değer seti', value: 'both', options: [['both', 'En koruyucu: ICNIRP 2013 + 2006/25/AT (önerilen)'], ['icnirp', 'Yalnız ICNIRP 2013 / IEC 60825-1:2014 Ek A'], ['aord', 'Yalnız 2006/25/AT Ek II (AB / Türkiye işyeri)']], help: 'Önerilen ayarda iki setin her kuralı kendi açıklığıyla ayrı uygulanır ve en kısıtlayıcı olanı belirler. 2006/25/AT, Türkiye\'de işyeri risk değerlendirmesinde esas alınan AB maruziyet sınır değerleridir.' },
        { id: 'wl', type: 'num', label: 'Dalga boyu', units: 'wavelength', unit: 'nm', value: '532', min: 180, max: 1e6, help: 'Çok dalga boylu lazerlerde her bant için ayrı analiz yapın; ayarlanabilir lazerde en kısa dalga boyunu girin.' },
        { id: 'mode', type: 'seg', label: 'Çalışma modu', value: 'cw', options: [['cw', 'Sürekli (CW)'], ['sp', 'Tek darbe'], ['rp', 'Tekrarlı darbe']] },
        { id: 'P', type: 'num', label: 'Çıkış gücü', units: 'power', unit: 'W', value: '1', min: 1e-12, max: 1e9, showIf: isMode('cw') },
        { id: 'sp_kind', type: 'select', label: 'Verilen büyüklük', value: 'Q', options: [['Q', 'Darbe enerjisi'], ['Pp', 'Tepe güç']], showIf: isMode('sp') },
        { id: 'rp_kind', type: 'select', label: 'Verilen büyüklük', value: 'Q', options: [['Q', 'Darbe enerjisi'], ['P', 'Ortalama güç'], ['Pp', 'Tepe güç']], showIf: isMode('rp') },
        { id: 'Q', type: 'num', label: 'Darbe enerjisi', units: 'energy', unit: 'mJ', value: '10', min: 1e-15, max: 1e6, showIf: (g) => (g('mode') === 'sp' && g('sp_kind') === 'Q') || (g('mode') === 'rp' && g('rp_kind') === 'Q') },
        { id: 'Pavg', type: 'num', label: 'Ortalama güç', units: 'power', unit: 'W', value: '1', min: 1e-12, max: 1e9, showIf: (g) => g('mode') === 'rp' && g('rp_kind') === 'P' },
        { id: 'Pp', type: 'num', label: 'Tepe güç', units: 'power', unit: 'kW', value: '100', min: 1e-12, max: 1e18, showIf: (g) => (g('mode') === 'sp' && g('sp_kind') === 'Pp') || (g('mode') === 'rp' && g('rp_kind') === 'Pp') },
        { id: 'tau', type: 'num', label: 'Darbe süresi (FWHM)', units: 'tau', unit: 'ns', value: '10', min: 1e-16, max: 3e4, showIf: isMode('sp', 'rp'), help: 'Q-anahtarlı darbeler genelde 1–200 ns arasındadır; bu aralıkta retina MPE\'si değişmez.' },
        { id: 'f', type: 'num', label: 'Tekrarlama frekansı (PRF)', units: 'frequency', unit: 'Hz', value: '10', min: 1e-6, max: 1e12, showIf: isMode('rp') },
        { id: 'T_auto', type: 'check', label: 'Standart maruziyet süresi kullan', value: true, showIf: isMode('cw', 'rp') },
        { id: 'T', type: 'num', label: 'Göz maruziyet süresi T', units: 'texp', unit: 's', value: '0.25', min: 1e-13, max: 3e4, showIf: isMode('cw', 'rp'), disabledIf: (g) => g('T_auto') === true },
        { id: 'T_presets', type: 'presets', target: 'T', showIf: isMode('cw', 'rp'), items: [['0.25', 's', '0,25 s kazara (görünür)'], ['10', 's', '10 s (IR)'], ['100', 's', '100 s kasıtlı'], ['600', 's', '600 s ayar'], ['30000', 's', '30 000 s (8 sa)']] },
      ],
    },
    {
      id: 'beam', title: 'Işın', open: false,
      fields: [
        { id: 'spec', type: 'select', label: 'Çap ve ıraksama ölçütü', value: '1/e2', options: [['1/e2', '1/e² (%86,5 — çoğu üretici verisi)'], ['1/e', '1/e (%63 — standart hesap ölçütü)']], help: 'Gauss ışında 1/e² değerleri √2\'ye bölünerek 1/e\'ye çevrilir.' },
        { id: 'profile', type: 'select', label: 'Işın profili', value: 'gauss', options: [['gauss', 'Gauss'], ['tophat-ellipse', 'Düz tepe — dairesel/eliptik'], ['tophat-rect', 'Düz tepe — dikdörtgen']] },
        { id: 'ellip', type: 'check', label: 'Asimetrik (eliptik/dikdörtgen) ışın', value: false },
        { id: 'dx', type: 'num', label: 'Işın çapı (çıkış / bel)', labelEllip: 'Büyük eksen çapı', units: 'diameter', unit: 'mm', value: '2', min: 0, max: 10, help: 'Bilinmiyorsa 1 mm çoğu lazer için muhafazakârdır.' },
        { id: 'phix', type: 'num', label: 'Iraksama (tam açı)', labelEllip: 'Büyük eksen ıraksaması', units: 'angle', unit: 'mrad', value: '1', min: 0, max: Math.PI, help: 'Bilinmiyorsa 1 mrad muhafazakâr bir varsayımdır.' },
        { id: 'dy', type: 'num', label: 'Küçük eksen çapı', units: 'diameter', unit: 'mm', value: '1', min: 0, max: 10, showIf: (g) => g('ellip') === true },
        { id: 'phiy', type: 'num', label: 'Küçük eksen ıraksaması', units: 'angle', unit: 'mrad', value: '1', min: 0, max: Math.PI, showIf: (g) => g('ellip') === true },
        { id: 'm2', type: 'calc', label: 'Işın kalitesi M²' },
        { id: 'range', type: 'num', label: 'Gözlem mesafesi (OD için)', units: 'distance', unit: 'm', value: '0', min: 0, max: 1e8, help: 'Işın belinden (çıkıştan) gözlemciye uzaklık. 0 = çıkışta.' },
        { id: 'alpha', type: 'num', label: 'Görünür kaynak açısı α (gelişmiş)', units: 'angle', unit: 'mrad', value: '0', min: 0, max: Math.PI, help: '0 = nokta kaynak (en muhafazakâr). Yalnız genişletilmiş kaynaklar (dizi diyot vb.) için girin.' },
        { id: 'model', type: 'select', label: 'Işın büyüme modeli', value: 'quad', options: [['quad', 'Karesel toplam √(d²+(rφ)²) — ANSI, daha muhafazakâr'], ['linear', 'Doğrusal d + rφ — IEC TR 60825-14']] },
      ],
    },
    {
      id: 'optics', title: 'Optik destekli bakış ve atmosfer', open: false,
      fields: [
        { id: 'oav', type: 'check', label: 'Dürbün/teleskopla bakış olasılığını hesaba kat (ENOHD)', value: false, help: '302,5–4000 nm\'de uygulanır (IEC 60825-1:2014 Koşul 1); cam optikler bu aralığın dışını geçirmez. Büyütme M = objektif çapı / 7 mm (örn. 7×50 dürbün).' },
        { id: 'oavD', type: 'num', label: 'Objektif çapı', units: 'diameter', unit: 'mm', value: '50', min: 7e-3, max: 1, showIf: (g) => g('oav') === true },
        { id: 'oavTau', type: 'text', label: 'Optik geçirgenlik (%) — boş: otomatik (görünür %90, UV ve IR %70)', value: '', showIf: (g) => g('oav') === true },
        { id: 'scint', type: 'check', label: 'Atmosferik türbülans (sintilasyon) payı: +1 OD', value: true, help: 'Açık havada uzun ışın yolunda türbülans hücreleri anlık mercek gibi davranıp ışınımı yerel olarak artırabilir. Açıkken ışınım ×10 (+1 OD) kabul edilerek ek NOHD ve gözlük önerisi verilir; standart sonuçlar ayrıca gösterilir. Gücün tamamının göz bebeğine girdiği üst sınır aşılmaz.' },
        { id: 'mu', type: 'num', label: 'Atmosferik zayıflama katsayısı μ', units: 'atten', unit: '1/km', value: '0', min: 0, max: 1e3, help: '0 = zayıflama yok (muhafazakâr). Çok açık hava (yakın IR) ≈ 0,05 1/km.' },
      ],
    },
    {
      id: 'diffuse', title: 'Yaygın (difüz) yansıma', open: false,
      fields: [
        { id: 'dr_on', type: 'check', label: 'Yaygın yansıma tehlikesini hesapla', value: true },
        { id: 'rho', type: 'text', label: 'Yansıtma oranı ρ (%)', value: '100', showIf: (g) => g('dr_on') === true },
        { id: 'theta', type: 'text', label: 'Bakış açısı — yüzey normaline göre (°)', value: '0', showIf: (g) => g('dr_on') === true },
        { id: 'dr_r', type: 'num', label: 'Yüzeye bakış mesafesi', units: 'distance', unit: 'm', value: '0.5', min: 1e-3, max: 1e4, showIf: (g) => g('dr_on') === true },
        { id: 'dr_T_auto', type: 'check', label: 'Varsayılan süre (600 s, ayar sırasında bakış)', value: true, showIf: (g) => g('dr_on') === true && g('mode') !== 'sp' },
        { id: 'dr_T', type: 'num', label: 'Yansımaya maruziyet süresi', units: 'texp', unit: 's', value: '600', min: 1e-13, max: 3e4, showIf: (g) => g('dr_on') === true && g('mode') !== 'sp', disabledIf: (g) => g('dr_T_auto') === true },
        { id: 'dr_ext', type: 'check', label: 'Genişletilmiş kaynak olarak değerlendir (C_E uygula)', value: false, showIf: (g) => g('dr_on') === true, help: 'Kapalıyken nokta kaynak varsayılır (muhafazakâr).' },
        { id: 'dr_spot', type: 'num', label: 'Hedefteki leke çapı', units: 'diameter', unit: 'mm', value: '5', min: 1e-6, max: 10, showIf: (g) => g('dr_on') === true && g('dr_ext') === true },
      ],
    },
    {
      id: 'lensfiber', title: 'Mercek ve fiber optik', open: false,
      fields: [
        { id: 'lens_on', type: 'check', label: 'Lazere takılı mercek (lens-on-laser)', value: false },
        { id: 'lens_f', type: 'num', label: 'Odak uzaklığı (ıraksak mercek için negatif)', units: 'diameter', unit: 'mm', value: '100', min: -1e3, max: 1e3, showIf: (g) => g('lens_on') === true },
        { id: 'lens_b', type: 'num', label: 'Mercekteki ışın çapı (ölçüt yukarıdaki ile aynı)', units: 'diameter', unit: 'mm', value: '5', min: 1e-6, max: 10, showIf: (g) => g('lens_on') === true },
        { id: 'lens_r', type: 'num', label: 'Odak noktasından gözlem mesafesi', units: 'distance', unit: 'm', value: '1', min: 0, max: 1e6, showIf: (g) => g('lens_on') === true },
        { id: 'fiber', type: 'select', label: 'Fiber optik çıkış', value: 'none', options: [['none', 'Yok'], ['multi', 'Çok modlu fiber (NA)'], ['single', 'Tek modlu fiber (MFD)']] },
        { id: 'fiber_NA', type: 'text', label: 'Sayısal açıklık NA', value: '0.22', showIf: (g) => g('fiber') === 'multi' },
        { id: 'fiber_MFD', type: 'num', label: 'Mod alan çapı (1/e²)', units: 'diameter', unit: 'µm', value: '10.4', min: 1e-7, max: 1e-3, showIf: (g) => g('fiber') === 'single' },
        { id: 'fiber_r', type: 'num', label: 'Fiber ucundan gözlem mesafesi', units: 'distance', unit: 'm', value: '1', min: 0, max: 1e6, showIf: (g) => g('fiber') !== 'none' },
      ],
    },
    {
      id: 'skinew', title: 'Deri ve göz koruyucu', open: false,
      fields: [
        { id: 'Tskin', type: 'num', label: 'Deri maruziyet süresi', units: 'texp', unit: 's', value: '10', min: 1e-13, max: 3e4, showIf: isMode('cw', 'rp'), help: 'Elin ışında kalabileceği en uzun süre; 10 s yaygın kabuldür.' },
        { id: 'skinArea', type: 'select', label: 'Maruz kalan deri alanı (1400 nm üstü, t > 10 s)', value: 'small', options: [['small', '< 0,01 m² (küçük alan)'], ['mid', '0,01 – 0,1 m²'], ['large', '> 0,1 m² (geniş alan)']] },
        { id: 'skinA', type: 'text', label: 'Deri alanı (m²)', value: '0.05', showIf: (g) => g('skinArea') === 'mid' },
        { id: 'ew_mode', type: 'select', label: 'EN 207/208 için gözlükteki ışın çapı', value: 'exit', options: [['exit', 'Çıkış çapı (varsayılan)'], ['range', 'Belirli mesafedeki çap'], ['given', 'Çapı elle gir']] },
        { id: 'ew_r', type: 'num', label: 'Gözlüğün lazere en yakın konumu', units: 'distance', unit: 'm', value: '1', min: 0, max: 1e6, showIf: (g) => g('ew_mode') === 'range' },
        { id: 'ew_d', type: 'num', label: 'Gözlükteki en küçük ışın çapı (ölçüt yukarıdaki ile aynı)', units: 'diameter', unit: 'mm', value: '2', min: 1e-6, max: 10, showIf: (g) => g('ew_mode') === 'given' },
        { id: 'ew_win', type: 'select', label: 'EN 207 darbe sayımı penceresi (N = f × t)', value: '10', options: [['10', '10 s (muhafazakâr)'], ['5', '5 s']] },
      ],
    },
    {
      id: 'ident', title: 'Lazer kimliği (rapor ve envanter)', open: false,
      fields: [
        { id: 'name', type: 'text', label: 'Lazer tanımı *', value: '', placeholder: 'örn. Nd:YAG markalama lazeri' },
        { id: 'maker', type: 'text', label: 'Üretici', value: '' },
        { id: 'modelNo', type: 'text', label: 'Model', value: '' },
        { id: 'serial', type: 'text', label: 'Seri no', value: '' },
        { id: 'inv', type: 'text', label: 'Envanter / demirbaş no', value: '' },
        { id: 'cls', type: 'select', label: 'Lazer sınıfı (etiket — IEC 60825-1)', value: '', options: [['', 'Belirtilmedi'], ['1', 'Sınıf 1'], ['1M', 'Sınıf 1M'], ['1C', 'Sınıf 1C'], ['2', 'Sınıf 2'], ['2M', 'Sınıf 2M'], ['3R', 'Sınıf 3R'], ['3B', 'Sınıf 3B'], ['4', 'Sınıf 4']] },
        { id: 'loc', type: 'text', label: 'Konum (bina / oda)', value: '' },
        { id: 'owner', type: 'text', label: 'Lazer sorumlusu / kullanıcı', value: '' },
        { id: 'lso', type: 'text', label: 'Lazer güvenlik sorumlusu (LGS)', value: '' },
        { id: 'date', type: 'text', label: 'Analiz tarihi', value: '' },
        { id: 'status', type: 'select', label: 'Durum', value: 'Aktif', options: [['Aktif', 'Aktif'], ['Bakımda', 'Bakımda'], ['Depoda', 'Depoda'], ['Hizmet dışı', 'Hizmet dışı']] },
        { id: 'app', type: 'text', label: 'Uygulama', value: '' },
        { id: 'notes', type: 'textarea', label: 'Notlar ve öneriler (rapora eklenir)', value: '' },
      ],
    },
  ];

  const FIELDS = {};
  for (const s of SECTIONS) for (const f of s.fields) FIELDS[f.id] = f;

  /** Hesaba giren seçim alanları (kimlik bölümündeki sınıf/durum hariç). */
  const CALC_CHOICES = ['limits', 'mode', 'sp_kind', 'rp_kind', 'spec', 'profile', 'model', 'fiber', 'skinArea', 'ew_mode', 'ew_win'];

  // ---------------------------------------------------------------------------
  // Durum
  // ---------------------------------------------------------------------------
  function defaultState() {
    const v = {};
    const u = {};
    for (const id in FIELDS) {
      const f = FIELDS[id];
      if ('value' in f) v[id] = f.value;
      if (f.unit) u[id] = f.unit;
    }
    v.date = todayStr();
    return { v, u };
  }

  function todayStr() {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }

  let state = defaultState();
  const els = {}; // id → { wrap, input, unit, echo }
  let onChange = () => {};

  function g(id) {
    return state.v[id];
  }

  // ---------------------------------------------------------------------------
  // DOM oluşturma
  // ---------------------------------------------------------------------------
  function h(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
      }
    }
    for (const c of [].concat(children || [])) if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return e;
  }

  /**
   * Bölümler açılışta kapalıdır (başlıkta özet görünür, dokununca açılır). Form yeniden kurulurken
   * (ör. dil değişince) kullanıcının açtığı bölümler açık kalır.
   */
  function build(container, changeCb) {
    onChange = changeCb || onChange;
    const wasOpen = new Set(Array.from(container.querySelectorAll ? container.querySelectorAll('details.sec[open]') : []).map((d) => d.id));
    const rebuilt = !!container.querySelector && !!container.querySelector('details.sec');
    container.innerHTML = '';
    for (const k in els) delete els[k];
    for (const s of SECTIONS) {
      const id = 'sec-' + s.id;
      const det = h('details', { class: 'sec', id, open: (rebuilt ? wasOpen.has(id) : s.open) ? true : null });
      det.appendChild(h('summary', null, [T(s.title), h('span', { class: 'hint', id: 'hint-' + s.id })]));
      const body = h('div', { class: 'sec-body' });
      for (const f of s.fields) body.appendChild(buildField(f));
      det.appendChild(body);
      container.appendChild(det);
    }
    refresh();
  }

  /** Birim adı (dk/sa İngilizcede min/h). */
  const unitText = (u) => (u === 'dk' || u === 'sa' ? T(u) : u);

  /**
   * Alan açıklaması: varsayılan olarak gizli, etiketin yanındaki (i) düğmesine dokununca açılır.
   * "Açıklamalar: her zaman" ayarında body.help-always ile hepsi görünür.
   */
  function helpParts(f) {
    if (!f.help) return { btn: null, box: null };
    const hid = 'help-' + f.id;
    const box = h('div', { class: 'help', id: hid, text: T(f.help) });
    const btn = h('button', { type: 'button', class: 'info-btn', 'aria-expanded': 'false', 'aria-controls': hid, 'aria-label': T('Açıklama'), title: T('Açıklama'), text: 'i' });
    btn.addEventListener('click', () => {
      const open = !box.classList.contains('show');
      box.classList.toggle('show', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    return { btn, box };
  }

  const lrow = (labelEl, btn) => (btn ? h('div', { class: 'lrow' }, [labelEl, btn]) : labelEl);

  function buildField(f) {
    const wrap = h('div', { class: 'field', id: 'f-' + f.id });
    const rec = { wrap };
    els[f.id] = rec;
    const inputId = 'in-' + f.id;
    const hp = helpParts(f);
    if (f.type === 'num') {
      const lab = h('label', { for: inputId, text: T(f.label) });
      rec.label = lab;
      const input = h('input', { id: inputId, inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' });
      input.value = state.v[f.id];
      input.addEventListener('input', () => { state.v[f.id] = input.value; changed(); });
      const sel = h('select', { 'aria-label': T('{0} birimi', T(f.label)) });
      for (const un of UL[f.units]) sel.appendChild(h('option', { value: un, text: unitText(un) }));
      sel.value = state.u[f.id];
      sel.addEventListener('change', () => { state.u[f.id] = sel.value; changed(); });
      const ctl = h('div', { class: 'ctl unit' }, [input, sel]);
      const echo = h('div', { class: 'echo', id: 'echo-' + f.id });
      wrap.append(lrow(lab, hp.btn), ctl, echo);
      if (hp.box) wrap.appendChild(hp.box);
      Object.assign(rec, { input, unit: sel, echo });
    } else if (f.type === 'text') {
      const lab = h('label', { for: inputId, text: T(f.label) });
      const input = h('input', { id: inputId, autocomplete: 'off', placeholder: f.placeholder ? T(f.placeholder) : null });
      input.value = state.v[f.id];
      input.addEventListener('input', () => { state.v[f.id] = input.value; changed(); });
      const echo = h('div', { class: 'echo', id: 'echo-' + f.id });
      wrap.append(lrow(lab, hp.btn), input, echo);
      if (hp.box) wrap.appendChild(hp.box);
      Object.assign(rec, { input, echo });
    } else if (f.type === 'textarea') {
      const lab = h('label', { for: inputId, text: T(f.label) });
      const input = h('textarea', { id: inputId });
      input.value = state.v[f.id];
      input.addEventListener('input', () => { state.v[f.id] = input.value; changed(true); });
      wrap.append(lab, input);
      Object.assign(rec, { input });
    } else if (f.type === 'select') {
      const lab = h('label', { for: inputId, text: T(f.label) });
      const sel = h('select', { id: inputId });
      for (const [val, txt] of f.options) sel.appendChild(h('option', { value: val, text: T(txt) }));
      sel.value = state.v[f.id];
      sel.addEventListener('change', () => { state.v[f.id] = sel.value; changed(); });
      wrap.append(lrow(lab, hp.btn), sel);
      if (hp.box) wrap.appendChild(hp.box);
      Object.assign(rec, { input: sel });
    } else if (f.type === 'seg') {
      wrap.appendChild(lrow(h('div', { class: 'lbl', text: T(f.label) }), hp.btn));
      const seg = h('div', { class: 'seg', role: 'group', 'aria-label': T(f.label) });
      rec.buttons = [];
      for (const [val, txt] of f.options) {
        const b = h('button', { type: 'button', 'aria-pressed': String(state.v[f.id] === val), text: T(txt) });
        b.addEventListener('click', () => { state.v[f.id] = val; changed(); });
        b.dataset.val = val;
        rec.buttons.push(b);
        seg.appendChild(b);
      }
      wrap.appendChild(seg);
      if (hp.box) wrap.appendChild(hp.box);
    } else if (f.type === 'check') {
      const input = h('input', { type: 'checkbox', id: inputId });
      input.checked = !!state.v[f.id];
      input.addEventListener('change', () => { state.v[f.id] = input.checked; changed(); });
      wrap.appendChild(lrow(h('label', { class: 'chk', for: inputId }, [input, T(f.label)]), hp.btn));
      const echo = h('div', { class: 'echo', id: 'echo-' + f.id });
      wrap.appendChild(echo);
      if (hp.box) wrap.appendChild(hp.box);
      Object.assign(rec, { input, echo });
    } else if (f.type === 'presets') {
      const box = h('div', { class: 'presets' });
      for (const [val, un, txt] of f.items) {
        box.appendChild(h('button', {
          type: 'button', class: 'chip', text: T(txt),
          onclick: () => {
            state.v[f.target] = val; state.u[f.target] = un;
            if (f.target === 'T') state.v.T_auto = false;
            syncDom(); changed();
          },
        }));
      }
      wrap.appendChild(box);
    } else if (f.type === 'calc') {
      wrap.appendChild(h('div', { class: 'lbl', text: T(f.label) }));
      const line = h('div', { class: 'presets' });
      const out = h('span', { class: 'mono', id: 'm2-out', text: '—' });
      const btn = h('button', { type: 'button', class: 'minibtn', text: T('Kırınım sınırı ıraksamasını yaz (M² = 1)'), onclick: setDiffractionLimit });
      line.append(out, btn);
      wrap.appendChild(line);
      rec.out = out;
    }
    return wrap;
  }

  function changed(textOnly) {
    if (!textOnly) refresh();
    onChange();
  }

  /** Durumu DOM'a yazar (örnek yükleme vb. sonrası). */
  function syncDom() {
    for (const id in els) {
      const r = els[id];
      const f = FIELDS[id];
      if (!r.input && !r.buttons) continue;
      if (f.type === 'check') r.input.checked = !!state.v[id];
      else if (r.input) r.input.value = state.v[id] === undefined ? '' : state.v[id];
      if (r.unit) r.unit.value = state.u[id];
    }
    refresh();
  }

  /** Görünürlük, etkinlik, mod düğmeleri. */
  function refresh() {
    for (const id in FIELDS) {
      const f = FIELDS[id];
      const r = els[id];
      if (!r) continue;
      const vis = f.showIf ? !!f.showIf(g) : true;
      r.wrap.classList.toggle('hidden', !vis);
      const dis = f.disabledIf ? !!f.disabledIf(g) : false;
      r.wrap.classList.toggle('disabled', dis);
      if (r.input) r.input.disabled = dis;
      if (r.unit) r.unit.disabled = dis;
      if (r.buttons) for (const b of r.buttons) b.setAttribute('aria-pressed', String(state.v[id] === b.dataset.val));
      if (r.label && f.labelEllip) r.label.textContent = T(state.v.ellip ? f.labelEllip : f.label);
    }
  }

  // ---------------------------------------------------------------------------
  // Okuma ve doğrulama
  // ---------------------------------------------------------------------------
  function readNum(id, errs, warns, echo) {
    const f = FIELDS[id];
    const unit = state.u[id];
    // İçe aktarılan / eski kayıtta listede olmayan birim: sessizce başka birimle yorumlanmaz
    if (UL[f.units].indexOf(unit) < 0) { errs[id] = T('Bilinmeyen birim "{0}": listeden bir birim seçin.', String(unit)); return NaN; }
    const r = U.parseNumber(state.v[id]);
    if (!r.ok) { errs[id] = X(r.error); return NaN; }
    const kind = KIND[f.units] || f.units;
    const si = U.toSI(r.value, kind, state.u[id]);
    if (f.min !== undefined && si < f.min) { errs[id] = T('Değer çok küçük (en az {0} {1}).', U.fmt(U.fromSI(f.min, kind, state.u[id])), unitText(state.u[id])); return NaN; }
    if (f.max !== undefined && si > f.max) { errs[id] = T('Değer çok büyük (en çok {0} {1}).', U.fmt(U.fromSI(f.max, kind, state.u[id])), unitText(state.u[id])); return NaN; }
    if (r.warning) warns[id] = X(r.warning);
    echo[id] = echoText(si, f.units);
    return si;
  }

  function readPlain(id, errs, warns, echo, min, max, unitTxt) {
    const r = U.parseNumber(state.v[id]);
    if (!r.ok) { errs[id] = X(r.error); return NaN; }
    if (r.value < min || r.value > max) { errs[id] = T('Değer {0} ile {1} arasında olmalı.', U.fmt(min), U.fmt(max)); return NaN; }
    if (r.warning) warns[id] = X(r.warning);
    echo[id] = unitTxt === '%' ? '= ' + U.fmtPct(r.value / 100, 4) : '= ' + U.fmt(r.value, 4) + (unitTxt ? ' ' + unitTxt : '');
    return r.value;
  }

  function echoText(si, units) {
    switch (units) {
      case 'wavelength': return '= ' + U.fmt(si, 5) + ' nm';
      case 'power': return '= ' + U.fmtPrefixed(si, 'W', 4);
      case 'energy': return '= ' + U.fmtPrefixed(si, 'J', 4);
      case 'tau': case 'texp': return '= ' + U.fmtTime(si);
      case 'frequency': return '= ' + U.fmtPrefixed(si, 'Hz', 4);
      case 'diameter': return '= ' + U.fmt(si * 1e3, 4) + ' mm';
      case 'angle': return '= ' + U.fmt(si * 1e3, 4) + ' mrad';
      case 'distance': return '= ' + U.fmtDist(si, 4);
      case 'atten': return '= ' + U.fmt(si, 4) + ' 1/m';
      default: return '';
    }
  }

  const visible = (id) => !FIELDS[id].showIf || !!FIELDS[id].showIf(g);

  /**
   * Formu okuyup motor girişine çevirir.
   * @returns {{ inp, errs, warns, echo, ok }}
   */
  function read() {
    const errs = {};
    const warns = {};
    const echo = {};
    const num = (id) => readNum(id, errs, warns, echo);
    // hesaba giren seçimler listedeki bir değer olmalı (bozuk kayıt sessizce varsayılana dönmez)
    for (const id of CALC_CHOICES) {
      const f = FIELDS[id];
      if (!f.options.some((o) => o[0] === state.v[id])) errs[id] = T('Geçersiz seçim "{0}": listeden seçin.', String(state.v[id]));
    }
    const mode = g('mode');
    const lambda = num('wl');
    const inp = { lambda, mode, limits: g('limits') || 'both' };
    const def = LE.analysis.defaultExposure(lambda > 0 ? lambda : 532);

    if (mode === 'cw') inp.P = num('P');
    if (mode === 'sp') {
      inp.tau = num('tau');
      if (g('sp_kind') === 'Q') inp.Q = num('Q');
      else { const pp = num('Pp'); inp.Q = pp * inp.tau; }
    }
    if (mode === 'rp') {
      inp.tau = num('tau');
      inp.f = num('f');
      const k = g('rp_kind');
      if (k === 'Q') inp.Q = num('Q');
      else if (k === 'P') inp.P = num('Pavg');
      else inp.Ppeak = num('Pp');
    }
    if (mode !== 'sp') {
      if (g('T_auto')) {
        inp.T = def;
        echo.T = T(lambda < 400 ? 'Standart: {0} (UV, tam vardiya)' : lambda < 700 ? 'Standart: {0} (görünür, kazara bakış — göz kırpma)' : 'Standart: {0} (IR, kazara bakış)', U.fmtTime(def));
      } else inp.T = num('T');
    }

    // ışın
    const spec = g('spec');
    const profile = g('profile');
    const conv = (x) => LE.beam.toD63(x, spec, profile);
    const dx = conv(num('dx'));
    const phix = conv(num('phix'));
    let dy = dx;
    let phiy = phix;
    if (g('ellip')) { dy = conv(num('dy')); phiy = conv(num('phiy')); }
    inp.beam = { profile, dx, dy, phix, phiy };
    inp.model = g('model');
    inp.range = num('range');
    inp.alpha = num('alpha') * 1e3; // mrad
    if (inp.alpha > 0) echo.alpha = T('= {0} mrad (genişletilmiş kaynak)', U.fmt(inp.alpha, 4));
    else echo.alpha = T('Nokta kaynak (α ≤ {0} mrad)', U.fmt(1.5));
    // M²
    const lam = lambda * 1e-9;
    let m2 = NaN;
    if (profile === 'gauss' && dx > 0 && phix > 0 && lam > 0) {
      m2 = (Math.PI * dx * phix) / (2 * lam); // 1/e çap & ıraksama ile
      inp.m2 = m2;
    }
    const m2el = els.m2 && els.m2.out;
    if (m2el) {
      if (Number.isFinite(m2)) {
        m2el.textContent = 'M² ≈ ' + U.fmt(m2, 3) + (m2 < 0.98 ? '  ⚠ ' + T('kırınım sınırının altında — çap/ıraksamayı kontrol edin') : '');
        m2el.style.color = m2 < 0.98 ? 'var(--danger)' : '';
      } else m2el.textContent = profile === 'gauss' ? '—' : T('Düz tepe profilde hesaplanmaz');
    }
    if (Number.isFinite(m2) && m2 < 0.98) warns.phix = T('Çap × ıraksama kırınım sınırından küçük (M² < 1): fiziksel olarak mümkün değil.');

    // optik ve atmosfer
    if (g('oav')) {
      const D = num('oavD');
      let tau;
      if (String(state.v.oavTau || '').trim() !== '') tau = readPlain('oavTau', errs, warns, echo, 1, 100, '%') / 100;
      inp.oav = { on: true, D, tau };
      if (lambda > 0) {
        if (lambda >= LE.analysis.OAV_MIN_NM && lambda < LE.analysis.OAV_MAX_NM) {
          const tAuto = lambda >= 400 && lambda < 700 ? 0.9 : 0.7;
          echo.oav = T(tau > 0 ? 'Hesaplanıyor: M = {0}×, τ = {1}' : 'Hesaplanıyor: M = {0}×, τ = {1} (otomatik)', U.fmt(Math.max(1, (D > 0 ? D : 0.05) / 7e-3), 3), U.fmtPct(tau > 0 ? tau : tAuto));
        } else {
          warns.oav = T('{0} nm\'de dürbün etkisi hesaplanmaz: cam optikler 302,5 nm altını ve 4 µm üstünü geçirmez.', U.fmt(lambda, 5));
        }
      }
    }
    inp.mu = num('mu');
    inp.scint = { on: g('scint') === true, factor: 10 };

    // yaygın yansıma
    if (g('dr_on')) {
      const rho = readPlain('rho', errs, warns, echo, 0, 100, '%') / 100;
      const thetaDeg = readPlain('theta', errs, warns, echo, 0, 89.9, '°');
      const d = { rho, thetaDeg, r: num('dr_r') };
      if (mode !== 'sp') {
        if (g('dr_T_auto')) { d.T = 600; echo.dr_T = T('Varsayılan: 600 s (göz maruziyet süresinden uzunsa o kullanılır)'); } else d.T = num('dr_T');
      }
      if (g('dr_ext')) { d.extended = true; d.spotD = num('dr_spot'); }
      inp.diffuse = d;
    }

    // mercek / fiber
    if (g('lens_on')) {
      const fl = num('lens_f');
      if (fl === 0) errs.lens_f = T('Odak uzaklığı sıfır olamaz.');
      inp.lens = { f: fl, b: conv(num('lens_b')), range: num('lens_r') };
    }
    if (g('fiber') === 'multi') inp.fiber = { type: 'multi', NA: readPlain('fiber_NA', errs, warns, echo, 0.01, 0.99, ''), range: num('fiber_r') };
    if (g('fiber') === 'single') inp.fiber = { type: 'single', MFD: num('fiber_MFD'), range: num('fiber_r') };

    // deri ve gözlük
    if (mode !== 'sp') inp.Tskin = num('Tskin');
    const sa = g('skinArea');
    inp.skinAreaM2 = sa === 'large' ? 0.2 : sa === 'mid' ? readPlain('skinA', errs, warns, echo, 0.01, 0.1, 'm²') : 0;
    const ew = { window: Number(g('ew_win')) || 10 };
    if (g('ew_mode') === 'range') ew.r = num('ew_r');
    if (g('ew_mode') === 'given') ew.d = conv(num('ew_d'));
    inp.eyewear = ew;

    // yalnız görünür alanların hatalarını say
    for (const id of Object.keys(errs)) if (!visible(id)) delete errs[id];
    showMessages(errs, warns, echo);
    return { inp, errs, warns, echo, ok: Object.keys(errs).length === 0 };
  }

  function showMessages(errs, warns, echo) {
    for (const id in els) {
      const r = els[id];
      if (!r.echo) {
        // seçim kutuları: hata metni sonuç alanında listelenir, alan kırmızı çerçeveyle işaretlenir
        r.wrap.classList.toggle('invalid', !!errs[id]);
        continue;
      }
      r.wrap.classList.toggle('invalid', !!errs[id]);
      if (errs[id]) { r.echo.textContent = errs[id]; r.echo.className = 'echo err'; }
      else if (warns[id]) { r.echo.textContent = (echo[id] ? echo[id] + ' — ' : '') + warns[id]; r.echo.className = 'echo warn'; }
      else { r.echo.textContent = echo[id] || ''; r.echo.className = 'echo'; }
    }
  }

  function setDiffractionLimit() {
    const r = U.parseNumber(state.v.dx);
    const l = U.parseNumber(state.v.wl);
    if (!r.ok || !l.ok || !(r.value > 0)) return;
    const lambda = U.toSI(l.value, 'wavelength', state.u.wl) * 1e-9;
    const d = U.toSI(r.value, 'diameter', state.u.dx); // girilen ölçütte
    // M² = 1: 1/e² için φ = 4λ/(π d); 1/e için φ63 = 2λ/(π d63)
    const phi = state.v.spec === '1/e2' ? (4 * lambda) / (Math.PI * d) : (2 * lambda) / (Math.PI * d);
    const un = state.u.phix;
    state.v.phix = String(Number(U.fromSI(phi, 'angle', un).toPrecision(4)));
    syncDom();
    onChange();
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Durumu yükler (oturum, envanter, içe aktarılan JSON). Yalnız tanımlı alanlar ve basit değerler alınır:
   * "__proto__" gibi anahtarlar ya da bilinmeyen alanlar durumu kirletemez.
   */
  function setState(s) {
    const d = defaultState();
    const own = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
    const plain = (x) => x === null || ['string', 'number', 'boolean'].indexOf(typeof x) >= 0;
    const src = s && typeof s === 'object' ? s : {};
    for (const id in FIELDS) {
      if (own(src.v, id) && plain(src.v[id])) d.v[id] = src.v[id];
      if (own(src.u, id) && own(d.u, id) && typeof src.u[id] === 'string') d.u[id] = src.u[id];
    }
    state = d;
    // içe aktarılan JSON'da tür farkları: onay kutusu boolean, seçim değeri metin olmalı
    for (const id in FIELDS) {
      const f = FIELDS[id];
      const v = state.v[id];
      if (f.type === 'check') state.v[id] = v === true || v === 'true';
      else if ((f.type === 'select' || f.type === 'seg') && v !== undefined) state.v[id] = v === null ? f.value : String(v);
    }
    syncDom();
  }

  function sectionHint(id, text) {
    const e = document.getElementById('hint-' + id);
    if (e) e.textContent = text || '';
  }

  LE.form = { SECTIONS, FIELDS, build, read, getState, setState, defaultState, syncDom, sectionHint, todayStr, get: g };
})(typeof globalThis !== 'undefined' ? globalThis : this);
