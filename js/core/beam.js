/*
 * Lazer Emniyet — ışın geometrisi
 *
 * Tüm çaplar ve ıraksamalar 1/e (%63 güç) ölçütündedir; giriş 1/e² ise
 * Gauss profilinde √2'ye bölünerek dönüştürülür (düz tepe profilde aynı kabul
 * edilir). Uzaklıkla büyüme varsayılan olarak karesel toplamdır:
 *   d(r) = √(d₀² + (r·φ)²)              (ANSI Z136.1, Gauss ışını için tam)
 * İsteğe bağlı doğrusal model: d(r) = d₀ + r·φ   (IEC TR 60825-14)
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  const PROFILES = ['gauss', 'tophat-ellipse', 'tophat-rect'];

  /** 1/e² ölçütünü 1/e ölçütüne çevirir (yalnız Gauss). */
  function toD63(value, spec, profile) {
    if (spec === '1/e2' && profile === 'gauss') return value / Math.SQRT2;
    return value;
  }

  function grow(d0, phi, r, model) {
    if (!(r > 0)) return d0;
    if (model === 'linear') return d0 + r * phi;
    return Math.sqrt(d0 * d0 + r * phi * r * phi);
  }

  /**
   * Işın tanımı:
   *  { profile, dx, dy (m, 1/e ya da tam genişlik), phix, phiy (rad, tam açı) }
   * Uzaklık r'deki kesit: { profile, dx, dy }
   */
  function sectionAt(beam, r, model) {
    return {
      profile: beam.profile,
      dx: grow(beam.dx, beam.phix, r, model),
      dy: grow(beam.dy, beam.phiy, r, model),
    };
  }

  const NTH = 256; // açısal integral nokta sayısı (periyodik → yamuk kuralı)
  const COS = new Float64Array(NTH);
  const SIN = new Float64Array(NTH);
  for (let i = 0; i < NTH; i++) {
    const th = (2 * Math.PI * (i + 0.5)) / NTH;
    COS[i] = Math.cos(th);
    SIN[i] = Math.sin(th);
  }

  /**
   * Işının merkezine yerleştirilmiş D çaplı dairesel açıklıktan geçen güç oranı.
   */
  function fractionInAperture(sec, D) {
    const R = D / 2;
    const dx = sec.dx;
    const dy = sec.dy;
    if (!(dx > 0) || !(dy > 0)) return 1; // nokta ışın
    if (sec.profile === 'gauss') {
      if (Math.abs(dx - dy) <= 1e-12 * Math.max(dx, dy)) {
        return -Math.expm1(-(D / dx) * (D / dx));
      }
      // eliptik Gauss: ∫ (1 − e^{−R²k}) / (2k) dθ  /  (π dx dy / 4)
      let s = 0;
      for (let i = 0; i < NTH; i++) {
        const k = 4 * ((COS[i] * COS[i]) / (dx * dx) + (SIN[i] * SIN[i]) / (dy * dy));
        s += -Math.expm1(-R * R * k) / (2 * k);
      }
      s *= (2 * Math.PI) / NTH;
      return Math.min(1, s / ((Math.PI * dx * dy) / 4));
    }
    if (sec.profile === 'tophat-ellipse') {
      const ax = dx / 2;
      const ay = dy / 2;
      if (R >= Math.max(ax, ay)) return 1;
      if (R <= Math.min(ax, ay)) return (R * R) / (ax * ay);
      let s = 0;
      for (let i = 0; i < NTH; i++) {
        const rho = 1 / Math.sqrt((COS[i] * COS[i]) / (ax * ax) + (SIN[i] * SIN[i]) / (ay * ay));
        const m = Math.min(R, rho);
        s += 0.5 * m * m;
      }
      s *= (2 * Math.PI) / NTH;
      return Math.min(1, s / (Math.PI * ax * ay));
    }
    // dikdörtgen düz tepe
    const hx = dx / 2;
    const hy = dy / 2;
    if (R * R >= hx * hx + hy * hy) return 1;
    if (R <= Math.min(hx, hy)) return (Math.PI * R * R) / (4 * hx * hy);
    // daire ∩ dikdörtgen alanı (analitik, bir çeyrek × 4)
    return Math.min(1, (4 * quarterCircleRect(R, hx, hy)) / (4 * hx * hy));
  }

  /** [0,hx]×[0,hy] dikdörtgeni ile R yarıçaplı çeyrek dairenin kesişim alanı. */
  function quarterCircleRect(R, hx, hy) {
    // ∫_0^{min(hx,R)} min(hy, √(R²−x²)) dx
    const F = (x) => 0.5 * (x * Math.sqrt(Math.max(0, R * R - x * x)) + R * R * Math.asin(Math.min(1, x / R)));
    const xe = Math.min(hx, R);
    if (hy >= R) return F(xe) - F(0);
    const xc = Math.sqrt(R * R - hy * hy); // y = hy çizgisinin daireyi kestiği x
    if (xe <= xc) return hy * xe;
    return hy * xc + (F(xe) - F(xc));
  }

  /** Tepe ışınımı / güç (1/m²). */
  function peakFactor(sec) {
    if (!(sec.dx > 0) || !(sec.dy > 0)) return Infinity;
    if (sec.profile === 'tophat-rect') return 1 / (sec.dx * sec.dy);
    return 4 / (Math.PI * sec.dx * sec.dy);
  }

  /** Işın kesit alanı (m²) — EN 207/208 güç yoğunluğu için. */
  function sectionArea(sec) {
    if (sec.profile === 'tophat-rect') return sec.dx * sec.dy;
    return (Math.PI * sec.dx * sec.dy) / 4;
  }

  /**
   * Belirli bir açıklık için maruziyet geometrisi çarpanı (1/m²):
   *   X = enerji × çarpan
   * smallBeamPeak = true ve ışının küçük boyutu < 1 mm ise ortalama yerine
   * gerçek (tepe) değer kullanılır (ICNIRP Tablo 5 dipnot c, Tablo 7 dipnot b).
   */
  function exposureFactor(sec, apertureM, smallBeamPeak) {
    const minDim = Math.min(sec.dx, sec.dy);
    if (smallBeamPeak && minDim > 0 && minDim < 1e-3) return { k: peakFactor(sec), peak: true, frac: 1 };
    const A = (Math.PI * apertureM * apertureM) / 4;
    const frac = fractionInAperture(sec, apertureM);
    return { k: frac / A, peak: false, frac };
  }

  LE.beam = {
    PROFILES, toD63, grow, sectionAt, fractionInAperture, peakFactor,
    sectionArea, exposureFactor,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
