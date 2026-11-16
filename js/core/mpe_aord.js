/*
 * Lazer Emniyet — 2006/25/AT maruziyet sınır değerleri (MSD)
 *
 * Kaynak: Avrupa Parlamentosu ve Konseyi'nin 2006/25/AT sayılı Direktifi
 * (yapay optik radyasyon), Ek II "Lazer optik radyasyonu", Tablo 2.2–2.6
 * (AB Resmî Gazetesi L 114, 27.4.2006, s. 53–59). Türkiye'de ÇSGB'nin
 * "Yapay Optik Radyasyon Kaynaklarıyla Yapılan Çalışmalarda Sağlık ve
 * Güvenlik Önlemleri Rehberi" bu tablolara atıf yapar.
 *
 * Değerler ICNIRP 2000 / IEC 60825-1:2001-2007 kuşağına dayanır ve ICNIRP 2013'ten
 * bazı bölgelerde farklıdır (retina kısa darbe 5·10⁻³ C_E J/m², 1200–1400 nm
 * C_C = 8, sabit α_max = 100 mrad, Kural 3'te tüm termal sınırlara C_P = N^−0,25).
 *
 * Birimler: λ [nm], t [s], H [J/m²], E [W/m²], α [mrad], açıklık [m].
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  const ALPHA_MIN = 1.5;
  const ALPHA_MAX = 100; // mrad, 2006/25/AT'de süreden bağımsız

  // --- Tablo 2.5 ---------------------------------------------------------------
  function CA(l) {
    if (l < 700) return 1.0;
    if (l < 1050) return Math.pow(10, 0.002 * (l - 700));
    return 5.0;
  }
  function CB(l) {
    if (l < 450) return 1.0;
    return Math.pow(10, 0.02 * (l - 450));
  }
  function CC(l) {
    if (l < 1150) return 1.0;
    if (l < 1200) return Math.pow(10, 0.018 * (l - 1150));
    return 8.0;
  }
  function T1(l) {
    if (l < 450) return 10;
    if (l <= 500) return 10 * Math.pow(10, 0.02 * (l - 450));
    return 100;
  }
  function T2(alpha) {
    if (!(alpha > ALPHA_MIN)) return 10;
    if (alpha < ALPHA_MAX) return 10 * Math.pow(10, (alpha - ALPHA_MIN) / 98.5);
    return 100;
  }
  function CE(alpha) {
    const a = alpha > 0 ? alpha : 0;
    if (a <= ALPHA_MIN) return 1.0;
    if (a <= ALPHA_MAX) return a / ALPHA_MIN;
    return (a * a) / (ALPHA_MIN * ALPHA_MAX);
  }

  // --- Tablo 2.6: T_min (bu sürede gelen darbeler tek darbe sayılır) ------------
  // Tablo 2.6 aralıkları üstten kapalıdır (315 < λ ≤ 400 …), göz tabloları ise 400 nm'yi retina,
  // 1400 nm'yi IR (kornea) satırına koyar. Tam sınırda, uygulanan sınır değerinin grubu alınır
  // (400 nm → 18 µs, 1400 nm → 1 ms); bu, daha fazla darbeyi gruplayarak daha koruyucudur.
  function Tmin(l) {
    if (l <= 315) return NaN;
    if (l < 400) return 1e-9;
    if (l <= 1050) return 18e-6;
    if (l < 1400) return 50e-6;
    if (l <= 1500) return 1e-3;
    if (l <= 1800) return 10;
    if (l <= 2600) return 1e-3;
    return 1e-7;
  }

  // --- Açıklıklar (Tablo 2.2 / 2.3 / 2.4 ve dipnotları) -------------------------
  function eyeApertureM(l, t) {
    if (l >= 400 && l < 1400) return 7e-3;
    if (l >= 1e5) return 11e-3;
    if (t >= 10) return 3.5e-3;
    if (t <= 0.3) return 1e-3;
    return 1.5e-3 * Math.pow(t, 0.375);
  }
  function skinApertureM() {
    return 3.5e-3; // Tablo 2.4: tüm dalga boylarında 3,5 mm
  }

  // --- UV basamak değerleri (Tablo 2.2 ve 2.3) ---------------------------------
  // Tablo her nanometre için tek değer verir (303 nm → 40 J/m² ...). Ara dalga
  // boylarında muhafazakâr olarak bir alttaki satır kullanılır; 302–303 nm → 30.
  const UV_ROWS = [[303, 40], [304, 60], [305, 100], [306, 160], [307, 250], [308, 400], [309, 630], [310, 1000], [311, 1600], [312, 2500], [313, 4000], [314, 6300]];
  function uvStep(l) {
    let H = 30;
    for (const [w, v] of UV_ROWS) if (l >= w) H = v;
    return H;
  }

  function comp(mech, H, t, formula, extra) {
    return Object.assign({ mech, H, E: H / t, t, formula, set: 'AB' }, extra || {});
  }

  const IR_SUBNS = (l) => (l < 1500 ? 1e12 : l < 1800 ? 1e13 : l < 2600 ? 1e12 : 1e11);

  function uv(l, t) {
    if (t < 1e-9) return [comp('kornea-UV', 3e10 * t, t, 'E = 3·10¹⁰ W/m² (1 ns altı)', { thermal: false })];
    const out = [];
    if (l < 315) {
      const H = uvStep(l);
      out.push(comp('kornea-UV-fotokimyasal', H, t, H + ' J/m² (2006/25/AT, ' + (l < 303 ? '180–302 nm' : Math.floor(l) + ' nm satırı') + ')', { thermal: false }));
      if (l >= 303 && t < 10) out.push(comp('kornea-UV-termal', 5.6e3 * Math.pow(t, 0.25), t, '5,6·10³·t^0,25 J/m²', { thermal: false }));
    } else if (t < 10) {
      out.push(comp('kornea-UV-termal', 5.6e3 * Math.pow(t, 0.25), t, '5,6·10³·t^0,25 J/m²', { thermal: true }));
    } else {
      out.push(comp('kornea-UV-fotokimyasal', 1e4, t, '10⁴ J/m²', { thermal: false }));
    }
    return out;
  }

  function ir(l, t) {
    if (t < 1e-9) {
      const E = IR_SUBNS(l);
      return [comp('kornea-IR', E * t, t, 'E = ' + (E === 1e13 ? '10¹³' : E === 1e12 ? '10¹²' : '10¹¹') + ' W/m² (1 ns altı)', { thermal: true })];
    }
    if (t >= 10) return [comp('kornea-IR', 1000 * t, t, '1000 W/m²', { thermal: true })];
    let H;
    let f;
    if (l < 1500 || (l >= 1800 && l < 2600)) {
      if (t < 1e-3) { H = 1e3; f = '10³ J/m²'; } else { H = 5.6e3 * Math.pow(t, 0.25); f = '5,6·10³·t^0,25 J/m²'; }
    } else if (l < 1800) { H = 1e4; f = '10⁴ J/m²'; } else if (t < 1e-7) { H = 100; f = '100 J/m²'; } else { H = 5.6e3 * Math.pow(t, 0.25); f = '5,6·10³·t^0,25 J/m²'; }
    return [comp('kornea-IR', H, t, f, { thermal: true })];
  }

  /** Retina termal (400–1400 nm), Tablo 2.2 ve 2.3. */
  function retinalThermal(l, t, alpha) {
    const a = alpha > 0 ? alpha : 0;
    const ce = CE(a);
    const ca = CA(l);
    const cc = CC(l);
    const f = { CA: ca, CC: cc, CE: ce };
    let H;
    let formula;
    if (t < 10) {
      if (l < 1050) {
        const k = l < 700 ? 1 : ca;
        const kt = l < 700 ? 'C_E' : 'C_A·C_E';
        if (t < 1e-13) { H = 1.5e-4 * k * ce * (t / 1e-13); formula = '100 fs altı: E ≤ 1,5·10⁹·' + kt + ' W/m²'; }
        else if (t < 1e-11) { H = 1.5e-4 * k * ce; formula = '1,5·10⁻⁴·' + kt + ' J/m²'; }
        else if (t < 1e-9) { H = 2.7e4 * Math.pow(t, 0.75) * k * ce; formula = '2,7·10⁴·t^0,75·' + kt + ' J/m²'; }
        else if (t < 1.8e-5) { H = 5e-3 * k * ce; formula = '5·10⁻³·' + kt + ' J/m²'; }
        else { H = 18 * Math.pow(t, 0.75) * k * ce; formula = '18·t^0,75·' + kt + ' J/m²'; }
      } else {
        if (t < 1e-13) { H = 1.5e-3 * cc * ce * (t / 1e-13); formula = '100 fs altı: E ≤ 1,5·10¹⁰·C_C·C_E W/m²'; }
        else if (t < 1e-11) { H = 1.5e-3 * cc * ce; formula = '1,5·10⁻³·C_C·C_E J/m²'; }
        else if (t < 1e-9) { H = 2.7e5 * Math.pow(t, 0.75) * cc * ce; formula = '2,7·10⁵·t^0,75·C_C·C_E J/m²'; }
        else if (t < 5e-5) { H = 5e-2 * cc * ce; formula = '5·10⁻²·C_C·C_E J/m²'; }
        else { H = 90 * Math.pow(t, 0.75) * cc * ce; formula = '90·t^0,75·C_C·C_E J/m²'; }
      }
      return { H, formula, factors: f, subFs: t < 1e-13 };
    }
    // t ≥ 10 s (Tablo 2.3)
    const vis = l < 700;
    const kk = vis ? 1 : ca * cc;
    const kt = vis ? '' : 'C_A·C_C·';
    if (a <= ALPHA_MIN) return { H: 10 * kk * t, formula: '10·' + kt + '1 W/m² (α ≤ 1,5 mrad)'.replace('·1 W', ' W'), factors: f };
    const t2 = T2(a);
    f.T2 = t2;
    if (t <= t2) return { H: 18 * kk * ce * Math.pow(t, 0.75), formula: '18·' + kt + 'C_E·t^0,75 J/m² (t ≤ T₂)', factors: f };
    let E = 18 * kk * ce * Math.pow(t2, -0.25);
    let fm = '18·' + kt + 'C_E·T₂^−0,25 W/m² (t > T₂)';
    if (!vis && E > 1000) { E = 1000; fm += ', en çok 1000 W/m²'; }
    return { H: E * t, formula: fm, factors: f };
  }

  function retinalPhotochem(l, t) {
    if (!(l >= 400 && l < 600) || !(t >= 10)) return null;
    const cb = CB(l);
    if (t <= 100) return { H: 100 * cb, formula: '100·C_B J/m² (γ = 11 mrad)', factors: { CB: cb } };
    return { H: cb * t, formula: '1·C_B W/m²', factors: { CB: cb } };
  }

  /** Göz MSD bileşenleri (2006/25/AT). Küçük ışın tepe kuralı bu sette yoktur. */
  function eyeComponents(l, t, o) {
    o = o || {};
    const alpha = o.alpha > 0 ? o.alpha : 0;
    let list;
    if (l < 400) list = uv(l, t);
    else if (l >= 1400) list = ir(l, t);
    else {
      const th = retinalThermal(l, t, alpha);
      list = [comp('retina-termal', th.H, t, th.formula, { factors: th.factors, thermal: true, subFs: !!th.subFs })];
      const pc = retinalPhotochem(l, t);
      if (pc) list.push(comp('retina-fotokimyasal', pc.H, t, pc.formula, { factors: pc.factors, thermal: false }));
    }
    const ap = eyeApertureM(l, t);
    for (const c of list) { c.apertureM = ap; c.smallBeamPeak = false; }
    return list;
  }

  /** Deri MSD bileşenleri (Tablo 2.4). */
  function skinComponents(l, t) {
    let list;
    if (l < 400) {
      list = uv(l, t).map((c) => Object.assign(c, { mech: c.mech.replace('kornea', 'deri') }));
    } else if (l < 1400) {
      const ca = CA(l);
      const k = l < 700 ? '' : '·C_A';
      if (t < 1e-9) list = [comp('deri', 2e11 * (l < 700 ? 1 : ca) * t, t, 'E = 2·10¹¹' + k + ' W/m² (1 ns altı)')];
      else if (t < 1e-7) list = [comp('deri', 200 * ca, t, '200·C_A J/m²')];
      else if (t < 10) list = [comp('deri', 1.1e4 * ca * Math.pow(t, 0.25), t, '1,1·10⁴·C_A·t^0,25 J/m²')];
      else list = [comp('deri', 2e3 * ca * t, t, '2·10³·C_A W/m²')];
    } else {
      list = ir(l, t).map((c) => Object.assign(c, { mech: 'deri-IR' }));
    }
    for (const c of list) { c.apertureM = skinApertureM(); c.smallBeamPeak = false; c.thermal = l >= 400 || c.thermal; }
    return list;
  }

  function governing(list) {
    let best = null;
    for (const c of list) if (!best || c.H < best.H) best = c;
    return best;
  }
  const eyeMSD_H = (l, t, o) => governing(eyeComponents(l, t, o)).H;
  const skinMSD_H = (l, t) => governing(skinComponents(l, t)).H;

  LE.aord = {
    ALPHA_MIN, ALPHA_MAX, CA, CB, CC, T1, T2, CE, Tmin, eyeApertureM, skinApertureM,
    uvStep, retinalThermal, retinalPhotochem, eyeComponents, skinComponents, governing, eyeMSD_H, skinMSD_H,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
