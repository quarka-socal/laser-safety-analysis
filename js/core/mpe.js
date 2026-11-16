/*
 * Lazer Emniyet — MPE (Maksimum İzin Verilen Maruziyet) çekirdeği
 *
 * Kaynak: ICNIRP 2013, "Guidelines on limits of exposure to laser radiation of
 * wavelengths between 180 nm and 1,000 µm", Health Phys. 105(3):271–295,
 * Tablo 2, 3, 4, 5, 7 ve 8. IEC 60825-1:2014 Ek A ve ANSI Z136.1-2014 sınır
 * değerleri bu kılavuzla uyumludur (birimler farklıdır).
 *
 * İç birimler (SI): dalga boyu λ [nm], süre t [s], ışınım maruziyeti H [J/m²],
 * ışınım E [W/m²], açı α [mrad], açıklık çapı [m].
 *
 * Bu dosya DOM'a dokunmaz; tarayıcıda ve Node.js testlerinde aynen çalışır.
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  const ALPHA_MIN = 1.5; // mrad (ICNIRP Tablo 2)
  const T_MAX = 3e4; // s — tablolar 30 ks'ye kadar tanımlı
  const LAMBDA_MIN = 180; // nm
  const LAMBDA_MAX = 1e6; // nm (1 mm)

  // ---------------------------------------------------------------------------
  // Düzeltme faktörleri ve zaman parametreleri (ICNIRP Tablo 2, 3, 4)
  // ---------------------------------------------------------------------------

  /** C_A — retina pigment epiteli emilimi (400–1400 nm). */
  function CA(l) {
    if (l < 700) return 1.0;
    if (l < 1050) return Math.pow(10, 0.002 * (l - 700));
    return 5.0;
  }

  /** C_B — mavi ışık (fotokimyasal) ağırlığı (400–600 nm). */
  function CB(l) {
    if (l < 450) return 1.0;
    return Math.pow(10, 0.02 * (l - 450));
  }

  /** C_C — ön ortam geçirgenliği (700–1400 nm). 2013 sürümü, 1200 nm üstü yeni ifade. */
  function CC(l) {
    if (l < 1150) return 1.0;
    if (l < 1200) return Math.pow(10, 0.018 * (l - 1150));
    return 8 + Math.pow(10, 0.04 * (l - 1250));
  }

  /** T1 — küçük kaynakta termal/fotokimyasal geçiş süresi (bilgi amaçlı). */
  function T1(l) {
    if (l < 450) return 10;
    if (l < 500) return 10 * Math.pow(10, 0.02 * (l - 450));
    return 100;
  }

  /** T2 — göz hareketlerinin etkin olduğu kırılma süresi (s). */
  function T2(alpha) {
    if (!(alpha > ALPHA_MIN)) return 10;
    if (alpha <= 100) return 10 * Math.pow(10, (alpha - ALPHA_MIN) / 98.5);
    return 100;
  }

  /** Ti — darbelerin tek darbe sayıldığı süre (400–1400 nm). */
  function Ti(l) {
    if (l >= 400 && l < 1050) return 5e-6;
    if (l >= 1050 && l < 1400) return 13e-6;
    return NaN;
  }

  /** α_max (mrad), maruziyet süresine bağlı (2013 sürümü). */
  function alphaMax(t) {
    if (t < 625e-6) return 5;
    if (t <= 0.25) return 200 * Math.sqrt(t);
    return 100;
  }

  /** γ_ph — fotokimyasal sınır için kabul açısı (mrad, bilgi amaçlı). */
  function gammaPh(t) {
    if (t <= 100) return 11;
    if (t < 1e4) return 1.1 * Math.sqrt(t);
    return 110;
  }

  /**
   * C_E — kaynak boyutu düzeltmesi. Açık görüş alanıyla (toplam ışınım) ölçüm
   * için α > α_max durumunda C_E = α² / (α_min · α_max) kullanılır (ICNIRP denk. 5).
   */
  function CE(alpha, t) {
    const a = alpha > 0 ? alpha : 0;
    if (a <= ALPHA_MIN) return 1.0;
    const amax = alphaMax(t);
    if (a <= amax) return a / ALPHA_MIN;
    return (a * a) / (ALPHA_MIN * amax);
  }

  // ---------------------------------------------------------------------------
  // Ölçüm (sınırlayıcı) açıklıkları — ICNIRP Tablo 8
  // ---------------------------------------------------------------------------

  /** Göz için sınırlayıcı açıklık çapı (m). */
  function eyeApertureM(l, t) {
    if (l >= 400 && l < 1400) return 7e-3;
    if (l >= 1e5) return 11e-3;
    // 180–400 nm ve 1400 nm–100 µm
    if (t < 0.35) return 1e-3;
    if (t < 10) return 1.5e-3 * Math.pow(t, 0.375);
    return 3.5e-3;
  }

  /** Deri için sınırlayıcı açıklık çapı (m). */
  function skinApertureM(l) {
    return l >= 1e5 ? 11e-3 : 3.5e-3;
  }

  // ---------------------------------------------------------------------------
  // Yardımcılar
  // ---------------------------------------------------------------------------

  function comp(mech, H, t, formula, extra) {
    const c = { mech, H, E: H / t, t, formula };
    if (extra) Object.assign(c, extra);
    return c;
  }

  /** UV fotokimyasal sabit değerleri (180–315 nm), ICNIRP Tablo 5. */
  const UV_STEPS = [
    [302, 30], [303, 40], [304, 60], [305, 100], [306, 160], [307, 250],
    [308, 400], [309, 630], [310, 1000], [311, 1600], [312, 2500], [313, 4000],
    [315, 6300],
  ];

  function uvStepH(l) {
    for (const [upper, H] of UV_STEPS) if (l < upper) return H;
    return NaN; // 315 nm ve üstü bu fonksiyonun alanı dışında
  }

  /**
   * UV fotokimyasal sınır (180–315 nm). ICNIRP 2013 1 nm'lik basamaklarla, her
   * basamakta üst kenar değerini verir; IEC 60825-1:2014 ve ANSI Z136.1-2014 ise
   * 302,5 (ANSI: 302) nm üstünde sürekli C₂ = 10^{0,2(λ−295)} J/m² kullanır.
   * Muhafazakârlık için üçünün en küçüğü alınır.
   */
  function uvPhotochem(l) {
    if (l < 302) return { H: 30, formula: '30 J/m²' };
    const step = uvStepH(l);
    const c2 = Math.pow(10, 0.2 * (l - 295));
    let H = Math.min(step, c2);
    let formula = c2 <= step
      ? '10^{0,2(λ−295)} J/m² (IEC/ANSI C₂ ≤ ICNIRP basamağı ' + step + ' J/m²)'
      : step + ' J/m² (ICNIRP basamak değeri, ' + stepLabel(l) + ')';
    if (l < 302.5 && H > 30) { H = 30; formula = '30 J/m² (IEC: λ < 302,5 nm)'; }
    return { H, formula };
  }

  function uvPhotochemH(l) {
    return uvPhotochem(l).H;
  }

  // ---------------------------------------------------------------------------
  // Göz MPE bileşenleri — tek maruziyet (süre t)
  // ---------------------------------------------------------------------------

  /**
   * 1 ns altı UV ve 1400 nm üstü IR için: ICNIRP 2013 tablo alt sınırının
   * ışınımıyla sınırlama (E ≤ H(1 ns)/1 ns) ve ayrıca ICNIRP'nin önerdiği
   * muhafazakâr geçici yaklaşım (1 ns sınırının %10'u) — daha küçük olan.
   */
  function subNsCap(H1ns, t) {
    const byIrr = (H1ns * t) / 1e-9;
    const byTenth = 0.1 * H1ns;
    return byIrr < byTenth
      ? { H: byIrr, rule: 'E ≤ H(1 ns)/1 ns' }
      : { H: byTenth, rule: '0,1·H(1 ns) (ICNIRP geçici)' };
  }

  function uvComponents(l, t) {
    const out = [];
    if (t < 1e-9) {
      const base = uvComponents(l, 1e-9);
      const H1 = Math.min.apply(null, base.map((c) => c.H));
      const cap = subNsCap(H1, t);
      out.push(comp('kornea-UV', cap.H, t, '1 ns altı: ' + cap.rule, { subNs: true }));
      return out;
    }
    if (l < 315) {
      const pc = uvPhotochem(l);
      out.push(comp('kornea-UV-fotokimyasal', pc.H, t, pc.formula));
      if (t < 10) {
        out.push(comp('kornea-UV-termal', 5.6e3 * Math.pow(t, 0.25), t, '5,6·10³·t^0,25 J/m²'));
      }
    } else {
      if (t < 10) {
        out.push(comp('kornea-UV-termal', 5.6e3 * Math.pow(t, 0.25), t, '5,6·10³·t^0,25 J/m²'));
      } else {
        out.push(comp('kornea-UV-fotokimyasal', 1e4, t, '10⁴ J/m²'));
      }
    }
    return out;
  }

  function stepLabel(l) {
    let lower = 180;
    for (const [upper] of UV_STEPS) {
      if (l < upper) return lower + '–' + upper + ' nm';
      lower = upper;
    }
    return '';
  }

  function irComponents(l, t) {
    if (t < 1e-9) {
      const H1 = irComponents(l, 1e-9)[0].H;
      const cap = subNsCap(H1, t);
      return [comp('kornea-IR', cap.H, t, '1 ns altı: ' + cap.rule, { subNs: true })];
    }
    if (t >= 10) return [comp('kornea-IR', 1000 * t, t, '1,0 kW/m² · t')];
    let H, f;
    if (l < 1500) {
      if (t < 1e-3) { H = 1e3; f = '10³ J/m²'; } else { H = 5.6e3 * Math.pow(t, 0.25); f = '5,6·10³·t^0,25 J/m²'; }
    } else if (l < 1800) {
      H = 1e4; f = '10⁴ J/m²';
    } else if (l < 2600) {
      if (t < 1e-3) { H = 1e3; f = '10³ J/m²'; } else { H = 5.6e3 * Math.pow(t, 0.25); f = '5,6·10³·t^0,25 J/m²'; }
    } else {
      if (t < 1e-7) { H = 100; f = '100 J/m²'; } else { H = 5.6e3 * Math.pow(t, 0.25); f = '5,6·10³·t^0,25 J/m²'; }
    }
    return [comp('kornea-IR', H, t, f)];
  }

  /**
   * Retina termal sınırı (400–1400 nm), süre t, görünür kaynak açısı α.
   * Dönüş: { H, formula, factors }
   */
  function retinalThermal(l, t, alpha) {
    const a = alpha > 0 ? alpha : 0;
    const ce = CE(a, t);
    const ca = CA(l);
    const cc = CC(l);
    const f = { CA: ca, CC: cc, CE: ce };
    let H, formula;
    if (l < 700) {
      if (t < 1e-13) { H = 1e-3 * ce * (t / 1e-13); formula = '100 fs altı: E ≤ 10¹⁰·C_E W/m²'; }
      else if (t < 1e-11) { H = 1e-3 * ce; formula = '1,0·10⁻³·C_E J/m²'; }
      else if (t <= 5e-6) { H = 2e-3 * ce; formula = '2,0·10⁻³·C_E J/m²'; }
      else if (t < 10) { H = 18 * ce * Math.pow(t, 0.75); formula = '18·C_E·t^0,75 J/m²'; }
      else return longThermal(l, t, a, ce, 1, 1, f);
    } else if (l < 1050) {
      if (t < 1e-13) { H = 1e-3 * ce * (t / 1e-13); formula = '100 fs altı: E ≤ 10¹⁰·C_E W/m²'; }
      else if (t < 1e-11) { H = 1e-3 * ce; formula = '1,0·10⁻³·C_E J/m² (C_A uygulanmaz)'; }
      else if (t <= 5e-6) { H = 2e-3 * ca * ce; formula = '2,0·10⁻³·C_A·C_E J/m²'; }
      else if (t < 10) { H = 18 * ca * ce * Math.pow(t, 0.75); formula = '18·C_A·C_E·t^0,75 J/m²'; }
      else return longThermal(l, t, a, ce, ca, cc, f);
    } else {
      if (t < 1e-13) { H = 1e-3 * cc * ce * (t / 1e-13); formula = '100 fs altı: E ≤ 10¹⁰·C_C·C_E W/m²'; }
      else if (t < 1e-11) { H = 1e-3 * cc * ce; formula = '1,0·10⁻³·C_C·C_E J/m²'; }
      else if (t <= 13e-6) { H = 2e-2 * cc * ce; formula = '2,0·10⁻²·C_C·C_E J/m²'; }
      else if (t < 10) { H = 90 * cc * ce * Math.pow(t, 0.75); formula = '90·C_C·C_E·t^0,75 J/m²'; }
      else return longThermal(l, t, a, ce, ca, cc, f);
    }
    return { H, formula, factors: f, subFs: t < 1e-13 };
  }

  /** t ≥ 10 s retina termal sınırı (ICNIRP Tablo 5 "Thermal" satırları). */
  function longThermal(l, t, a, ce, ca, cc, f) {
    if (a <= ALPHA_MIN) {
      const E = 10 * ca * cc;
      const fm = l < 700 ? '10 W/m² (α ≤ 1,5 mrad)' : '10·C_A·C_C W/m² (α ≤ 1,5 mrad)';
      return { H: E * t, formula: fm, factors: f };
    }
    const t2 = T2(a);
    f.T2 = t2;
    const k = l < 700 ? '18·C_E' : '18·C_A·C_C·C_E';
    if (t <= t2) {
      return { H: 18 * ca * cc * ce * Math.pow(t, 0.75), formula: k + '·t^0,75 J/m² (t ≤ T₂)', factors: f };
    }
    return { H: 18 * ca * cc * ce * Math.pow(t2, -0.25) * t, formula: k + '·T₂^−0,25 W/m² (t > T₂)', factors: f };
  }

  /** Retina fotokimyasal sınırı (400–600 nm, t > 10 s). Nokta kaynak varsayımı. */
  function retinalPhotochem(l, t) {
    if (!(l >= 400 && l < 600) || !(t > 10)) return null;
    const cb = CB(l);
    if (t <= 100) return { H: 100 * cb, formula: '100·C_B J/m²', factors: { CB: cb } };
    return { H: cb * t, formula: '1,0·C_B W/m²', factors: { CB: cb } };
  }

  /**
   * Göz MPE bileşenleri.
   * @param {number} l   dalga boyu (nm)
   * @param {number} t   maruziyet süresi (s)
   * @param {object} [o] { alpha (mrad), anteriorDual (bool, vars. true) }
   * @returns {Array} her biri { mech, H, E, t, formula, apertureM, smallBeamPeak, ... }
   */
  function eyeComponents(l, t, o) {
    o = o || {};
    const alpha = o.alpha > 0 ? o.alpha : 0;
    const res = [];
    if (l < 400 || l >= 1400) {
      const list = l < 400 ? uvComponents(l, t) : irComponents(l, t);
      const ap = eyeApertureM(l, t);
      for (const c of list) {
        c.apertureM = ap;
        c.smallBeamPeak = t < 0.35; // Tablo 5 dipnot c
        res.push(c);
      }
      return res;
    }
    const th = retinalThermal(l, t, alpha);
    res.push(comp('retina-termal', th.H, t, th.formula, {
      factors: th.factors, apertureM: 7e-3, smallBeamPeak: false, subFs: !!th.subFs,
    }));
    const pc = retinalPhotochem(l, t);
    if (pc) {
      res.push(comp('retina-fotokimyasal', pc.H, t, pc.formula, {
        factors: pc.factors, apertureM: 7e-3, smallBeamPeak: false,
      }));
    }
    if (o.anteriorDual !== false) {
      // Tablo 5 dipnot d: göz ön bölümü için deri sınırı (görünür) veya
      // 2 × deri sınırı (IR-A) ikili sınır olarak uygulanır.
      const sk = skinBase(l, t);
      const k = l < 700 ? 1 : 2;
      res.push(comp('on-segment', k * sk.H, t, (k === 2 ? '2 × ' : '') + 'deri MPE (' + sk.formula + ')', {
        apertureM: skinApertureM(l), smallBeamPeak: true, dual: true,
      }));
      const an = anteriorANSI(l, t);
      if (an) {
        // kornea sınırı olduğu için IR kornea açıklık kuralı (1 mm → 3,5 mm) uygulanır
        res.push(comp('kornea-lens', an.H, t, an.formula, {
          apertureM: eyeApertureM(1500, t), smallBeamPeak: t < 0.35, dual: true, factors: { Klambda: an.K },
        }));
      }
    }
    return res;
  }

  /** K_λ (ANSI Z136.1-2014), 1200–1400 nm: 10^{0,01·(1400 − λ)}. */
  function Klambda(l) {
    return Math.pow(10, 0.01 * (1400 - l));
  }

  /**
   * 1200–1400 nm kornea/lens ikili sınırı (ANSI Z136.1-2014 Tablo 5a; Kentek
   * EasyHaz LSO 2014 ile doğrulandı). ICNIRP'nin 2 × deri sınırından daha
   * koruyucudur; IEC 60825-1:2014 Tablo A.1 not e) bu bölgede retina
   * sınırlarının ön bölümü yeterince korumayabileceğini belirtir.
   * SI birimleriyle:
   *   1e-11 ≤ t < 1e-3 : 3000·K_λ J/m²
   *   1e-3  ≤ t < 4    : 3000·K_λ + 5600·t^0,25 − 1000 J/m²
   *   4     ≤ t < 10   : 3000·K_λ + 7000 J/m²
   *   t ≥ 10           : min(300·K_λ + 700, 2000·C_A) W/m²
   */
  function anteriorANSI(l, t) {
    if (!(l >= 1200 && l < 1400) || t < 1e-11) return null;
    const K = Klambda(l);
    if (t < 1e-3) return { H: 3000 * K, K, formula: '3000·K_λ J/m² (ANSI 2014 kornea/lens)' };
    if (t < 4) return { H: 3000 * K + 5600 * Math.pow(t, 0.25) - 1000, K, formula: '(3000·K_λ + 5600·t^0,25 − 1000) J/m² (ANSI 2014 kornea/lens)' };
    if (t < 10) return { H: 3000 * K + 7000, K, formula: '(3000·K_λ + 7000) J/m² (ANSI 2014 kornea/lens)' };
    const E = Math.min(300 * K + 700, 2000 * CA(l));
    return { H: E * t, K, formula: 'min(300·K_λ + 700; 2000·C_A) W/m² (ANSI 2014 kornea/lens)' };
  }

  // ---------------------------------------------------------------------------
  // Deri MPE — ICNIRP Tablo 7
  // ---------------------------------------------------------------------------

  function skinBase(l, t) {
    // yalnız 400–1400 nm için
    const ca = CA(l);
    if (t < 1e-9) {
      const cap = subNsCap(200 * ca, t);
      return { H: cap.H, formula: '1 ns altı: ' + cap.rule, subNs: true };
    }
    if (t < 1e-7) return { H: 200 * ca, formula: '200·C_A J/m²' };
    if (t < 10) return { H: 1.1e4 * ca * Math.pow(t, 0.25), formula: '11·C_A·t^0,25 kJ/m²' };
    return { H: 2000 * ca * t, formula: '2,0·C_A kW/m²' };
  }

  /**
   * Deri MPE bileşenleri.
   * @param {object} [o] { skinAreaM2 } — 1400 nm üstü, t > 10 s için geniş alan düzeltmesi
   */
  function skinComponents(l, t, o) {
    o = o || {};
    const ap = skinApertureM(l);
    let list;
    if (l < 400) {
      list = uvComponents(l, t).map((c) => Object.assign(c, { mech: c.mech.replace('kornea', 'deri') }));
    } else if (l < 1400) {
      const b = skinBase(l, t);
      list = [comp('deri', b.H, t, b.formula, { subNs: !!b.subNs, factors: { CA: CA(l) } })];
    } else {
      list = irComponents(l, t).map((c) => Object.assign(c, { mech: 'deri-IR' }));
      const A = o.skinAreaM2 || 0;
      if (t >= 10 && A > 0.01) {
        const E = A >= 0.1 ? 100 : 10 / A;
        list = [comp('deri-IR', E * t, t, (A >= 0.1 ? '100 W/m²' : '10/A_s W/m²') + ' (geniş deri alanı)')];
      }
    }
    for (const c of list) {
      c.apertureM = ap;
      c.smallBeamPeak = true; // Tablo 7 dipnot b
    }
    return list;
  }

  /** En düşük (belirleyici) bileşen. */
  function governing(list) {
    let best = null;
    for (const c of list) if (!best || c.H < best.H) best = c;
    return best;
  }

  /** Kısa yol: göz MPE (H, J/m²) — en düşük bileşen. */
  function eyeMPE_H(l, t, o) {
    return governing(eyeComponents(l, t, o)).H;
  }

  function skinMPE_H(l, t, o) {
    return governing(skinComponents(l, t, o)).H;
  }

  /** Giriş alanı kontrolü. Hata mesajı (string) ya da null döner. */
  function checkDomain(l, t) {
    if (!(l >= LAMBDA_MIN && l <= LAMBDA_MAX)) return 'Dalga boyu 180 nm – 1 mm aralığında olmalı.';
    if (!(t > 0)) return 'Süre sıfırdan büyük olmalı.';
    if (t > T_MAX * (1 + 1e-9)) return 'Süre 30 000 s (8,3 saat) üstünde tanımlı değil.';
    return null;
  }

  LE.mpe = {
    ALPHA_MIN, T_MAX, LAMBDA_MIN, LAMBDA_MAX,
    CA, CB, CC, T1, T2, Ti, alphaMax, gammaPh, CE,
    eyeApertureM, skinApertureM,
    eyeComponents, skinComponents, governing, eyeMPE_H, skinMPE_H,
    retinalThermal, retinalPhotochem, checkDomain, uvPhotochemH, uvPhotochem,
    Klambda, anteriorANSI,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
