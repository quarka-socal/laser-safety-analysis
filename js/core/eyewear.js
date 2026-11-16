/*
 * Lazer Emniyet — göz koruyucu seçimi
 *
 *  EN 207 (lazer koruyucu gözlük): LB1…LB10 koruma seviyeleri, çalışma
 *    modları D (sürekli), I (1 µs < τ ≤ 0,25 s), R (1 ns < τ ≤ 1 µs),
 *    M (τ ≤ 1 ns). Tekrarlı darbede 400–1400 nm için darbe enerji yoğunluğu
 *    N^¼ ile çarpılır; N = f × 10 s (varsayılan pencere, ayarlanabilir).
 *    Tekrarlı darbede ortalama güç için D seviyesi de sağlanmalıdır.
 *  EN 208 (görünür ışın ayar gözlüğü, 400–700 nm): RB1…RB5.
 *  OD (ANSI Z136.1 tarzı): gerekli optik yoğunluk, yukarı yuvarlanmış.
 *
 * Yoğunluklar ışının 1/e (%63) çapıyla hesaplanan kesit alanına göredir.
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  // Tablo değerleri: LB n için izin verilen en yüksek yoğunluk = taban × 10^n
  const BASE = {
    D: { UV: 1e-3, VIS: 1e1, IR: 1e3 }, // W/m²
    IR: { UV: 3e1, VIS: 5e-3, IR: 1e2 }, // J/m²  (I ve R modları)
    M: { UV: 3e10, VIS: 1.5e-4, IR: 1e11 }, // UV/IR: W/m² (tepe), VIS: J/m²
  };

  function band(l) {
    if (l <= 315) return 'UV';
    if (l <= 1400) return 'VIS';
    return 'IR';
  }

  function pulseMode(tau) {
    if (tau > 0.25) return 'D';
    if (tau > 1e-6) return 'I';
    if (tau > 1e-9) return 'R';
    return 'M';
  }

  function lbFrom(density, base) {
    if (!(density > 0)) return { n: 0, raw: -Infinity };
    const raw = Math.log10(density / base);
    let n = Math.ceil(raw - 1e-9);
    if (n < 1) n = 1;
    return { n, raw };
  }

  function unitOf(mode, b) {
    if (mode === 'D') return 'W/m²';
    if (mode === 'M' && b !== 'VIS') return 'W/m²';
    return 'J/m²';
  }

  function evaluate(inp, s, beam, model) {
    const ew = inp.eyewear || {};
    const l = s.l;
    const b = band(l);
    const warnings = [];
    const notes = [];
    const r = ew.r > 0 ? ew.r : 0;
    let sec;
    if (ew.d > 0) sec = { profile: 'gauss', dx: ew.d, dy: ew.d };
    else sec = LE.beam.sectionAt(beam, r, model);
    let A = LE.beam.sectionArea(sec);
    if (!(A > 0)) {
      warnings.push('Gözlük konumunda ışın çapı 0: EN 207/208 için 1 mm varsayıldı. Gözlükteki gerçek en küçük ışın çapını girin.');
      sec = { profile: 'gauss', dx: 1e-3, dy: 1e-3 };
      A = LE.beam.sectionArea(sec);
    }
    const minD = Math.min(sec.dx, sec.dy);
    if (minD < 1e-3) notes.push('Gözlükteki ışın çapı 1 mm\'den küçük; EN 207 sınıflandırması bu durumda filtre/çerçeve üreticisinin verileriyle doğrulanmalı.');
    const win = ew.window > 0 ? ew.window : 10;
    const items = [];

    function add(mode, density, extra) {
      const base = BASE[mode === 'D' ? 'D' : (mode === 'M' ? 'M' : 'IR')][b];
      const lb = lbFrom(density, base);
      items.push(Object.assign({
        mode, density, unit: unitOf(mode, b), lb: lb.n, raw: lb.raw,
        over: lb.n > 10, label: mode + ' ' + fmtWl(l) + ' LB' + lb.n,
      }, extra || {}));
    }

    if (s.mode === 'cw') {
      add('D', s.P / A, { basis: 'Güç yoğunluğu P/A' });
    } else {
      const m = pulseMode(s.tau);
      const H = s.Q / A;
      const N = s.mode === 'rp' ? Math.max(1, s.f * win) : 1;
      const corr = s.mode === 'rp' && l >= 400 && l <= 1400;
      const k = corr ? Math.pow(N, 0.25) : 1;
      if (m === 'D') {
        add('D', (s.Q / s.tau) / A, { basis: 'Uzun darbe (τ > 0,25 s): tepe güç yoğunluğu' });
      } else if (m === 'M' && b !== 'VIS') {
        add('M', (s.Q / s.tau) / A, { basis: 'Tepe güç yoğunluğu (Q/τ)/A' });
      } else {
        add(m, H * k, {
          basis: corr ? 'Enerji yoğunluğu × N^¼ (N = ' + fmtN(N) + ', ' + win + ' s)' : 'Enerji yoğunluğu Q/A',
          H, N: corr ? N : null, k,
        });
      }
      if (s.mode === 'rp') add('D', s.P / A, { basis: 'Ortalama güç yoğunluğu P_ort/A' });
    }
    if (items.some((i) => i.over)) warnings.push('Gerekli koruma LB10\'u aşıyor: EN 207 kapsamında uygun gözlük yok. Mühendislik kontrolleri (muhafaza, kilit, ışın durdurucu) zorunlu.');

    // EN 208
    let en208 = null;
    if (l >= 400 && l <= 700) {
      en208 = rbEvaluate(s, win);
    }

    // OD
    const odW = inp._odWorst;
    // türbülans (sintilasyon) payı: yoğunluk ×F → her LB bir kademe (F = 10) yukarı
    const sF = inp.scint && inp.scint.on ? (inp.scint.factor > 1 ? inp.scint.factor : 10) : 1;
    const plus = sF > 1 ? Math.ceil(Math.log10(sF) - 1e-9) : 0;
    return {
      band: b, A, sec, r: ew.d > 0 ? null : r, dGiven: ew.d > 0 ? ew.d : null,
      window: win, en207: items, en208, warnings, notes,
      marking: marking(items, l),
      scintPlus: plus,
      markingScint: plus ? marking(items.map((i) => Object.assign({}, i, { lb: i.lb + plus })), l) : null,
      odNote: odW,
    };
  }

  function rbEvaluate(s, win) {
    const out = { items: [], rb: 0, applicable: true, note: null };
    function fromPower(P, basis) {
      const n = Math.max(1, Math.ceil(Math.log10(P) + 3 - 1e-9));
      out.items.push({ basis, value: P, unit: 'W', rb: n });
    }
    function fromEnergy(Q, basis) {
      const n = Math.max(1, Math.ceil(Math.log10(Q / 2e-7) - 1e-9));
      out.items.push({ basis, value: Q, unit: 'J', rb: n });
    }
    if (s.mode === 'cw') fromPower(s.P, 'Sürekli güç');
    else if (s.tau > 2e-4) fromPower(s.Q / s.tau, 'Darbe tepe gücü (τ > 0,2 ms)');
    else if (s.tau >= 1e-9) {
      const N = s.mode === 'rp' ? Math.max(1, s.f * win) : 1;
      const k = s.mode === 'rp' ? Math.pow(N, 0.25) : 1;
      fromEnergy(s.Q * k, s.mode === 'rp' ? 'Darbe enerjisi × N^¼ (N = ' + fmtN(N) + ')' : 'Darbe enerjisi');
    } else {
      out.applicable = false;
      out.note = '1 ns altı darbeler EN 208 kapsamında değil; EN 207 kullanın.';
    }
    if (s.mode === 'rp' && out.applicable) fromPower(s.P, 'Ortalama güç');
    out.rb = out.items.reduce((m, i) => Math.max(m, i.rb), 0);
    if (out.rb > 5) {
      out.applicable = false;
      out.note = 'RB5 üstü: EN 208 ayar gözlüğü bu güç/enerji için uygun değil; EN 207 koruyucu gözlük ve mühendislik kontrolleri gerekir.';
    }
    out.note = out.note || 'Tüm ışın gücünün göz bebeğine girdiği varsayıldı (muhafazakâr). Ayar gözlüğü ışını Sınıf 2 düzeyine indirir; doğrudan bakış amaçlı değildir.';
    return out;
  }

  function marking(items, l) {
    // aynı LB'ye sahip modları birleştir: örn. "DIR 1064 LB7"
    const byLb = {};
    for (const i of items) {
      (byLb[i.lb] = byLb[i.lb] || []).push(i.mode);
    }
    return Object.keys(byLb).sort((a, b) => a - b).map((lb) => {
      const modes = Array.from(new Set(byLb[lb])).sort((a, b) => 'DIRM'.indexOf(a) - 'DIRM'.indexOf(b)).join('');
      return modes + ' ' + fmtWl(l) + ' LB' + lb;
    }).join(' + ');
  }

  function fmtWl(l) {
    // ondalık dalga boyu (632,8): Türkçede virgül, İngilizce görünümde nokta
    const dec = LE.units && LE.units.locale && LE.units.locale() === 'en' ? '.' : ',';
    return Number.isInteger(l) ? String(l) : String(Math.round(l * 10) / 10).replace('.', dec);
  }

  function fmtN(N) {
    return N >= 1e5 ? LE.units.fmt(N, 2) : String(Math.round(N));
  }

  /** Gerekli OD'den önerilen tamsayı OD. */
  function recommendedOD(odv) {
    if (!(odv > 0)) return 0;
    return Math.ceil(odv - 1e-9);
  }

  LE.eyewear = { evaluate, band, pulseMode, lbFrom, BASE, rbEvaluate, recommendedOD };
})(typeof globalThis !== 'undefined' ? globalThis : this);
