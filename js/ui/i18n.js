/*
 * Lazer Emniyet — dil desteği (Türkçe / English)
 *
 * Türkçe metinler anahtardır: T('Türkçe metin', a, b) Türkçede metni olduğu gibi, İngilizcede
 * sözlükteki karşılığını verir ({0}, {1} yer tutucuları doldurulur).
 *
 * Hesap motorunun ürettiği metinler (uyarı, not, formül, kural etiketi) motora dokunmadan, gösterim
 * sırasında X() ile çevrilir: önce tam eşleşme, sonra cümle kalıpları, sonra sözcük öbekleri; en sonda
 * Türkçe ondalık virgül noktaya çevrilir. Motorun sayısal sonuçları dilden bağımsızdır.
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  let lang = 'tr';
  const EN = {}; // arayüz sözlüğü (lang_en.js doldurur)
  const missing = new Set(); // İngilizcede karşılığı bulunmayan anahtarlar (test için)

  function setLang(l) {
    lang = l === 'en' ? 'en' : 'tr';
    if (LE.units && LE.units.setLocale) LE.units.setLocale(lang);
  }

  function fill(s, args) {
    return args.length ? s.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined ? m : String(args[i]))) : s;
  }

  /** Arayüz metni. */
  function T(s, ...args) {
    if (lang === 'en') {
      if (Object.prototype.hasOwnProperty.call(EN, s)) return fill(EN[s], args);
      missing.add(s);
    }
    return fill(s, args);
  }

  function addEN(dict) {
    Object.assign(EN, dict);
  }

  // ---------------------------------------------------------------------------
  // Hesap motoru metinleri
  // ---------------------------------------------------------------------------

  const dec = (s) => s.replace(/(\d),(\d)/g, '$1.$2');
  const setTag = (p) => (p ? (p.indexOf('2006') === 0 ? '2006/25/EC — ' : 'ICNIRP — ') : '');

  /** Tam cümleler (motorun sabit metinleri). */
  const EXACT = {
    // analiz hataları
    'Dalga boyu 180 nm ile 1 000 000 nm (1 mm) arasında olmalı.': 'Wavelength must be between 180 nm and 1 000 000 nm (1 mm).',
    'Çalışma modu seçilmeli.': 'Select an operating mode.',
    'Güç sıfırdan büyük olmalı.': 'Power must be greater than zero.',
    'Darbe enerjisi sıfırdan büyük olmalı.': 'Pulse energy must be greater than zero.',
    'Darbe süresi sıfırdan büyük olmalı.': 'Pulse duration must be greater than zero.',
    'Darbe tekrarlama frekansı sıfırdan büyük olmalı.': 'Pulse repetition frequency must be greater than zero.',
    'Darbe enerjisi, ortalama güç veya tepe güçten biri girilmeli.': 'Enter the pulse energy, average power or peak power.',
    'Darbe süresi × frekans ≥ 1: darbeler örtüşüyor. Bu lazeri sürekli dalga (CW) olarak değerlendirin.': 'Pulse duration × frequency ≥ 1: the pulses overlap. Evaluate this laser as continuous wave (CW).',
    'Maruziyet süresi darbe süresinden kısa olamaz.': 'The exposure duration cannot be shorter than the pulse duration.',
    'Maruziyet süresi sıfırdan büyük olmalı.': 'The exposure duration must be greater than zero.',
    'Maruziyet süresi 30 000 s üstünde tanımlı değil (ICNIRP).': 'Exposure limits are not defined above 30 000 s (ICNIRP).',
    'Darbe süresi 30 000 s üstünde olamaz.': 'The pulse duration cannot exceed 30 000 s.',
    'Işın çapı negatif olamaz.': 'The beam diameter cannot be negative.',
    'Iraksama negatif olamaz.': 'The divergence cannot be negative.',
    // uyarılar
    '1 ns altı darbe: ICNIRP bu bölgede sınır vermiyor; muhafazakâr geçici yaklaşım (1 ns sınırının %10\'u veya ışınım sınırı) uygulandı.':
      'Pulse shorter than 1 ns: ICNIRP gives no limit in this region; the conservative interim approach (10% of the 1 ns limit or the irradiance limit) was applied.',
    '100 fs altı darbe: tepe ışınımı 100 fs sınırıyla sınırlandırıldı (ICNIRP önerisi).':
      'Pulse shorter than 100 fs: the peak irradiance was limited by the 100 fs limit (ICNIRP recommendation).',
    'Dürbünle bakış bu dalga boyunda hesaba katılmadı: cam optikler 302,5 nm altını ve 4 µm üstünü geçirmez (IEC 60825-1:2014 Koşul 1 aralığı 302,5–4000 nm).':
      'Optically aided viewing was not applied at this wavelength: glass optics do not transmit below 302.5 nm or above 4 µm (IEC 60825-1:2014 Condition 1 range 302.5–4000 nm).',
    'Görünmez ışın için önerilen en kısa maruziyet süresi 10 s; daha kısa süre muhafazakâr değildir.':
      'For an invisible beam the recommended minimum exposure duration is 10 s; a shorter duration is not conservative.',
    'Görünür bölgede maruziyet süresi 0,25 s\'den kısa seçildi; bu, göz kırpma tepkisi süresinden kısa ve muhafazakâr değildir.':
      'A visible exposure duration shorter than 0.25 s was chosen; this is shorter than the blink reflex and is not conservative.',
    'Iraksama sıfır (veya çok küçük) ve atmosferik zayıflama yok: NOHD pratikte sonsuz. Işın yolu tamamen kontrol altına alınmalı.':
      'Zero (or very small) divergence and no atmospheric attenuation: the NOHD is practically infinite. The beam path must be fully controlled.',
    'Yansıma katsayısı veya açı nedeniyle yaygın yansıma ışınımı sıfır.': 'The diffuse reflection irradiance is zero because of the reflectance or the viewing angle.',
    // notlar
    '1200–1400 nm: retina sınırına ek olarak göz ön bölümü için ikili sınırlar uygulandı — ANSI Z136.1-2014 kornea/lens sınırı (K_λ) ve ICNIRP 2013 2 × deri MPE; en düşüğü belirler.':
      '1200–1400 nm: in addition to the retinal limit, dual limits for the anterior eye were applied — the ANSI Z136.1-2014 cornea/lens limit (K_λ) and the ICNIRP 2013 2 × skin MPE; the lowest governs.',
    'Belirleyici sınır 2006/25/AT\'den geliyor (AB/Türkiye işyeri maruziyet sınır değerleri ICNIRP 2013\'ten daha kısıtlayıcı).':
      'The governing limit comes from 2006/25/EC (the EU/Turkish occupational exposure limit values are more restrictive than ICNIRP 2013).',
    'Iraksama sıfır: NOHD yalnız atmosferik zayıflamayla sınırlı.': 'Zero divergence: the NOHD is limited only by atmospheric attenuation.',
    'Işın çapı 1 mm\'den küçük: UV/IR göz (t < 0,35 s) ve deri değerlendirmesinde açıklık ortalaması yerine tepe değer kullanıldı (ICNIRP Tablo 5/7 dipnotları).':
      'Beam diameter below 1 mm: the peak value instead of the aperture average was used for the UV/IR eye (t < 0.35 s) and skin evaluation (ICNIRP Table 5/7 footnotes).',
    'NOHD 100 km\'yi aşıyor; atmosferik koşullar ve ışın sapmaları bu mesafede belirleyicidir.':
      'The NOHD exceeds 100 km; atmospheric conditions and beam pointing dominate at such distances.',
    // kural etiketleri
    'Sürekli dalga (t = T)': 'Continuous wave (t = T)',
    'Tek darbe': 'Single pulse',
    'Kural 1 — tek darbe': 'Rule 1 — single pulse',
    // EN 207 / EN 208 esasları ve mesajları
    'Güç yoğunluğu P/A': 'Power density P/A',
    'Uzun darbe (τ > 0,25 s): tepe güç yoğunluğu': 'Long pulse (τ > 0.25 s): peak power density',
    'Tepe güç yoğunluğu (Q/τ)/A': 'Peak power density (Q/τ)/A',
    'Enerji yoğunluğu Q/A': 'Energy density Q/A',
    'Ortalama güç yoğunluğu P_ort/A': 'Average power density P_avg/A',
    'Sürekli güç': 'CW power',
    'Darbe tepe gücü (τ > 0,2 ms)': 'Pulse peak power (τ > 0.2 ms)',
    'Darbe enerjisi': 'Pulse energy',
    'Ortalama güç': 'Average power',
    '1 ns altı darbeler EN 208 kapsamında değil; EN 207 kullanın.': 'Pulses shorter than 1 ns are outside the scope of EN 208; use EN 207.',
    'RB5 üstü: EN 208 ayar gözlüğü bu güç/enerji için uygun değil; EN 207 koruyucu gözlük ve mühendislik kontrolleri gerekir.':
      'Above RB5: EN 208 alignment eyewear is not suitable for this power/energy; EN 207 protective eyewear and engineering controls are required.',
    'Tüm ışın gücünün göz bebeğine girdiği varsayıldı (muhafazakâr). Ayar gözlüğü ışını Sınıf 2 düzeyine indirir; doğrudan bakış amaçlı değildir.':
      'The whole beam power is assumed to enter the pupil (conservative). Alignment eyewear reduces the beam to Class 2 level; it is not meant for direct viewing.',
    'Gerekli koruma LB10\'u aşıyor: EN 207 kapsamında uygun gözlük yok. Mühendislik kontrolleri (muhafaza, kilit, ışın durdurucu) zorunlu.':
      'The required protection exceeds LB10: no suitable EN 207 eyewear exists. Engineering controls (enclosure, interlock, beam stop) are mandatory.',
    'Gözlük konumunda ışın çapı 0: EN 207/208 için 1 mm varsayıldı. Gözlükteki gerçek en küçük ışın çapını girin.':
      'The beam diameter at the eyewear position is 0: 1 mm was assumed for EN 207/208. Enter the actual smallest beam diameter at the eyewear.',
    'Gözlükteki ışın çapı 1 mm\'den küçük; EN 207 sınıflandırması bu durumda filtre/çerçeve üreticisinin verileriyle doğrulanmalı.':
      'The beam diameter at the eyewear is below 1 mm; in this case verify the EN 207 rating with the filter/frame manufacturer\'s data.',
    // sayı ayrıştırma
    'Değer girilmedi.': 'No value entered.',
    'Geçersiz sayı biçimi.': 'Invalid number format.',
    'Sayı aralık dışında.': 'Number out of range.',
    'Birden fazla ayırıcı: binlik ayırıcı kullanmayın (örn. 1000 veya 1e3).': 'More than one separator: do not use thousands separators (e.g. 1000 or 1e3).',
    // setler
    'ICNIRP 2013 / IEC 60825-1:2014 Ek A': 'ICNIRP 2013 / IEC 60825-1:2014 Annex A',
    '2006/25/AT Ek II (AB / Türkiye işyeri MSD)': '2006/25/EC Annex II (EU / Turkish occupational ELV)',
  };

  /** Sayı içeren cümle kalıpları: [düzenli ifade, çeviri işlevi]. */
  const PATTERNS = [
    [/^(ICNIRP — |2006\/25\/AT — )?Darbe aralığı (Tᵢ|T_min) = (.+?)'den kısa: bu süre içindeki (.+?) darbe tek darbe olarak değerlendirildi\.$/,
      (m, p, g, t, n) => setTag(p) + 'Pulse spacing shorter than ' + g + ' = ' + t + ': the ' + n + ' pulses within this time were evaluated as a single pulse.'],
    [/^(ICNIRP — |2006\/25\/AT — )?Kural 3: (.+)\.$/, (m, p, why) => setTag(p) + 'Rule 3: ' + X(why) + '.'],
    [/^Genişletilmiş kaynak: α = (.+?) mrad, C_E = (.+?) \(ICNIRP, t = T\)(?:, (.+?) \(2006\/25\/AT\))?\.$/,
      (m, a, ci, ca) => 'Extended source: α = ' + a + ' mrad, C_E = ' + ci + ' (ICNIRP, t = T)' + (ca ? ', ' + ca + ' (2006/25/EC)' : '') + '.'],
    [/^Görünür bölgede 0,25 s kazara bakışa karşılık gelir; (.+) kasıtlı\/uzun bakış varsayımıdır\.$/,
      (m, t) => 'In the visible, 0.25 s corresponds to accidental viewing; ' + t + ' assumes intentional/prolonged viewing.'],
    [/^Kural 1 — (Tᵢ|T_min) içindeki (.+) darbe tek darbe sayılır$/, (m, g, n) => 'Rule 1 — ' + n + ' pulses within ' + g + ' counted as one pulse'],
    [/^Kural 2 — T içindeki (.+) darbe$/, (m, n) => 'Rule 2 — ' + n + ' pulses within T'],
    [/^Kural 2 — (.+) darbelik alt grup$/, (m, n) => 'Rule 2 — sub-group of ' + n + ' pulses'],
    [/^Kural 3 — C_P = (.+) ile tek darbe$/, (m, c) => 'Rule 3 — single pulse with C_P = ' + c],
    [/^Enerji yoğunluğu × N\^¼ \(N = (.+), (.+) s\)$/, (m, n, w) => 'Energy density × N^¼ (N = ' + n + ', ' + w + ' s)'],
    [/^Darbe enerjisi × N\^¼ \(N = (.+)\)$/, (m, n) => 'Pulse energy × N^¼ (N = ' + n + ')'],
    [/^"(.*)" ondalık sayı olarak yorumlandı; binlik ayırıcı değildir\.$/, (m, v) => '"' + v + '" was read as a decimal number, not with a thousands separator.'],
  ];

  /** Formül ve kısa metinlerde sözcük öbekleri (sırayla, tümü uygulanır). */
  const PHRASES = [
    [/(\d+) (ns|fs) altı/g, 'below $1 $2'],
    [/ \(geniş deri alanı\)/g, ' (large skin area)'],
    [/, en çok /g, ', at most '],
    [/\(C_A uygulanmaz\)/g, '(C_A not applied)'],
    [/deri MPE/g, 'skin MPE'],
    [/\(ICNIRP geçici\)/g, '(ICNIRP interim)'],
    [/ICNIRP basamak değeri/g, 'ICNIRP step value'],
    [/ICNIRP basamağı/g, 'ICNIRP step'],
    [/ nm satırı/g, ' nm row'],
    [/kornea\/lens/g, 'cornea/lens'],
    [/\(T_min grupları\)/g, '(T_min groups)'],
    [/ ve /g, ' and '],
    [/2006\/25\/AT/g, '2006/25/EC'],
    [/\bTablo\b/g, 'Table'],
    [/\bEk II\b/g, 'Annex II'],
    [/\bEk A\b/g, 'Annex A'],
    // öz-denetim adları
    [/^Açıklık /, 'Aperture '],
    [/en kötü OD/g, 'worst-case OD'],
    [/yaygın NHZ/g, 'diffuse NHZ'],
    [/çıkışta OD/g, 'OD at exit'],
    [/^Deri /, 'Skin '],
    [/ deri /g, ' skin '],
    [/^Dürbün /, 'Binoculars '],
    [/\(Lasermet örneği\)/g, '(Lasermet example)'],
    [/\(termal sınır\)/g, '(thermal limit)'],
    [/\(fotokimyasal\)/g, '(photochemical)'],
    [/\(nokta\)/g, '(point source)'],
    [/^MSD /, 'ELV '],
    [/darbe başına MSD/g, 'ELV per pulse'],
    [/(\d+) m'de OD/g, 'OD at $1 m'],
    [/^Türbülans payı: /, 'Scintillation margin: '],
    [/NOHD oranı/g, 'NOHD ratio'],
    [/önerilen OD/g, 'recommended OD'],
    [/^Varsayılan mod: iki setin en koruyucusu/, 'Default mode: most protective of both sets'],
  ];

  /** Hesap motorunun ürettiği metni seçili dile çevirir. */
  function X(s) {
    if (lang !== 'en' || s === null || s === undefined) return s;
    const t = String(s);
    if (Object.prototype.hasOwnProperty.call(EXACT, t)) return EXACT[t];
    for (const [re, fn] of PATTERNS) {
      const m = t.match(re);
      if (m) return dec(fn.apply(null, m));
    }
    let u = t;
    for (const [re, rep] of PHRASES) u = u.replace(re, rep);
    return dec(u);
  }

  LE.i18n = {
    T, X, setLang, addEN,
    lang: () => lang,
    missing: () => Array.from(missing),
    has: (s) => Object.prototype.hasOwnProperty.call(EN, s),
    keys: () => Object.keys(EN),
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
