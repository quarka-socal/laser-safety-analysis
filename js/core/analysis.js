/*
 * Lazer Emniyet — tehlike analizi
 *
 * Her maruziyet koşulu bir "kriter" listesine çevrilir. Her kriter:
 *   { kural, mekanizma, enerji (J), sınır H (J/m²), zaman tabanı t (s),
 *     açıklık (m), küçük-ışın kuralı, formül ... }
 * Bir noktadaki tehlike oranı = max_kriter (maruziyet / sınır).
 *   OD   = log10(oran)            (oran ≤ 1 → 0)
 *   NOHD = oran = 1 olan en uzak mesafe (oran mesafeyle artmayan bir fonksiyon)
 *
 * Tekrarlı darbede ICNIRP 2013 kuralları birlikte uygulanır:
 *   Kural 1 tek darbe; Kural 2 her darbe grubu (alt gruplar dahil) için T süresi
 *   sınırı; Kural 3 retina termal sınırına C_P çarpanı. T_i içinde kalan
 *   darbeler tek darbe sayılır.
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  const ENGINE_VERSION = '1.3.0';

  function defaultExposure(l) {
    if (l < 400) return 3e4;
    if (l < 700) return 0.25;
    return 10;
  }

  function isRetinal(l) {
    return l >= 400 && l < 1400;
  }

  /** W süresi içine (darbeler tamamen sığacak biçimde) girebilecek en fazla darbe. */
  function pulsesIn(W, f, tau) {
    if (!(f > 0)) return 1;
    if (W < tau) return 1;
    const x = f * (W - tau);
    return Math.floor(x * (1 + 1e-12) + 1e-9) + 1;
  }

  /** Kural 2 alt grup aday darbe sayıları (2..N−1). */
  function candidateKs(N) {
    const ks = [];
    if (N <= 2) return ks;
    const lim = Math.min(N - 1, 48);
    for (let k = 2; k <= lim; k++) ks.push(k);
    let k = 48;
    while (true) {
      k = Math.ceil(k * 1.25);
      if (k >= N) break;
      ks.push(k);
    }
    return ks;
  }

  /** ICNIRP 2013 Kural 3 — C_P. */
  function cpFactor(l, tauEff, T, alpha, nT2, Nexp) {
    const ti = LE.mpe.Ti(l);
    const a = alpha > 0 ? alpha : 0;
    if (tauEff <= ti * (1 + 1e-12)) {
      if (T <= 0.25) return { Cp: 1, why: 'τ ≤ Tᵢ ve t ≤ 0,25 s → C_P = 1' };
      if (Nexp > 600) {
        const cp = Math.min(1, 5 * Math.pow(nT2, -0.25));
        return { Cp: cp, why: 'τ ≤ Tᵢ, t > 0,25 s, N > 600 → C_P = 5·n^−0,25 (n = ' + fmtInt(nT2) + ')' };
      }
      return { Cp: 1, why: 'τ ≤ Tᵢ, N ≤ 600 → C_P = 1' };
    }
    if (a <= 5) return { Cp: 1, why: 'α ≤ 5 mrad ve τ > Tᵢ → C_P = 1' };
    if (a <= LE.mpe.alphaMax(tauEff)) {
      return nT2 <= 40
        ? { Cp: Math.pow(nT2, -0.25), why: '5 mrad < α ≤ α_max, n ≤ 40 → C_P = n^−0,25' }
        : { Cp: 0.4, why: '5 mrad < α ≤ α_max, n > 40 → C_P = 0,4' };
    }
    if (a < 100) {
      return nT2 <= 625
        ? { Cp: Math.pow(nT2, -0.25), why: 'α_max < α < 100 mrad, n ≤ 625 → C_P = n^−0,25' }
        : { Cp: 0.2, why: 'α_max < α < 100 mrad, n > 625 → C_P = 0,2' };
    }
    return { Cp: 1, why: 'α ≥ 100 mrad → C_P = 1' };
  }

  function fmtInt(n) {
    return n >= 1e6 ? n.toExponential(2) : String(Math.round(n));
  }

  /** Sınır değer setleri. */
  const SETS = {
    ICNIRP: { id: 'ICNIRP', short: 'ICNIRP 2013', label: 'ICNIRP 2013 / IEC 60825-1:2014 Ek A' },
    AB: { id: 'AB', short: '2006/25/AT', label: '2006/25/AT Ek II (AB / Türkiye işyeri MSD)' },
  };

  function setsFor(limits) {
    if (limits === 'icnirp') return ['ICNIRP'];
    if (limits === 'aord') return ['AB'];
    return ['ICNIRP', 'AB'];
  }

  /**
   * Kriter listesi oluşturur.
   * @param {object} s   { l, mode, Q, P, tau, f, T, alpha, skinAreaM2 }
   * @param {string} target 'eye' | 'skin'
   * @param {string} [setId] 'ICNIRP' (varsayılan) | 'AB'
   */
  function buildCriteria(s, target, setId) {
    setId = setId || 'ICNIRP';
    if (setId === 'AB') return buildCriteriaAB(s, target);
    const l = s.l;
    const comps = target === 'eye'
      ? (t) => LE.mpe.eyeComponents(l, t, { alpha: s.alpha })
      : (t) => LE.mpe.skinComponents(l, t, { skinAreaM2: s.skinAreaM2 });
    const list = [];
    const info = { set: 'ICNIRP' };
    function push(rule, label, amountJ, t, cs, extra) {
      for (const c of cs) {
        list.push(Object.assign({
          set: 'ICNIRP', rule, label, amountJ, t, limitH: c.H, mech: c.mech, apertureM: c.apertureM,
          smallBeamPeak: !!c.smallBeamPeak, formula: c.formula, factors: c.factors || null,
          subNs: !!c.subNs, subFs: !!c.subFs, dual: !!c.dual,
        }, extra || {}));
      }
    }

    if (s.mode === 'cw') {
      push('CW', 'Sürekli dalga (t = T)', s.P * s.T, s.T, comps(s.T));
      info.N = null;
    } else if (s.mode === 'sp') {
      push('TD', 'Tek darbe', s.Q, s.tau, comps(s.tau));
      info.N = 1;
    } else {
      const N = pulsesIn(s.T, s.f, s.tau);
      info.N = N;
      push('K1', 'Kural 1 — tek darbe', s.Q, s.tau, comps(s.tau));
      let tauEff = s.tau;
      let qEff = s.Q;
      let fEff = s.f;
      if (target === 'eye' && isRetinal(l)) {
        const ti = LE.mpe.Ti(l);
        const nTi = s.tau < ti ? pulsesIn(ti, s.f, s.tau) : 1;
        info.Ti = ti;
        info.nTi = nTi;
        if (nTi >= 2) {
          tauEff = ti;
          qEff = nTi * s.Q;
          fEff = s.f / nTi;
          push('K1', 'Kural 1 — Tᵢ içindeki ' + nTi + ' darbe tek darbe sayılır', qEff, ti,
            comps(ti).filter((c) => c.mech === 'retina-termal'), { k: nTi });
        }
      }
      push('K2', 'Kural 2 — T içindeki ' + fmtInt(N) + ' darbe', N * s.Q, s.T, comps(s.T), { k: N });
      for (const k of candidateKs(N)) {
        const Tk = (k - 1) / s.f + s.tau;
        if (Tk >= s.T) break;
        push('K2a', 'Kural 2 — ' + fmtInt(k) + ' darbelik alt grup', k * s.Q, Tk, comps(Tk), { k, sub: true });
      }
      if (target === 'eye' && isRetinal(l)) {
        const t2 = LE.mpe.T2(s.alpha);
        const nT2 = pulsesIn(Math.min(t2, s.T), fEff, tauEff);
        const Nexp = pulsesIn(s.T, fEff, tauEff);
        const cp = cpFactor(l, tauEff, s.T, s.alpha, nT2, Nexp);
        info.cp = Object.assign({ nT2, Nexp, tauEff }, cp);
        if (cp.Cp < 1) {
          const th = LE.mpe.retinalThermal(l, tauEff, s.alpha);
          list.push({
            set: 'ICNIRP', rule: 'K3', label: 'Kural 3 — C_P = ' + cp.Cp.toFixed(3).replace('.', ',') + ' ile tek darbe',
            amountJ: qEff, t: tauEff, limitH: cp.Cp * th.H, mech: 'retina-termal', apertureM: 7e-3,
            smallBeamPeak: false, formula: 'C_P × ' + th.formula, factors: Object.assign({ CP: cp.Cp }, th.factors),
            cpWhy: cp.why,
          });
        }
      }
    }
    return { list, info };
  }

  /**
   * 2006/25/AT kriterleri. Tablo 2.6: Kural 1, Kural 2 (alt gruplar dahil) ve
   * termal sınırlar için Kural 3, C_P = N^−0,25 (N: maruziyet süresindeki darbe
   * sayısı); T_min içinde gelen darbeler tek darbe sayılır. UV'de (315–400 nm)
   * Tablo 2.2 dipnot d uyarınca T_min içindeki darbe süreleri toplanır.
   */
  function buildCriteriaAB(s, target) {
    const l = s.l;
    const A = LE.aord;
    const comps = target === 'eye' ? (t) => A.eyeComponents(l, t, { alpha: s.alpha }) : (t) => A.skinComponents(l, t);
    const list = [];
    const info = { set: 'AB' };
    function push(rule, label, amountJ, t, cs, extra) {
      for (const c of cs) {
        list.push(Object.assign({
          set: 'AB', rule, label, amountJ, t, limitH: c.H, mech: c.mech, apertureM: c.apertureM,
          smallBeamPeak: false, formula: c.formula, factors: c.factors || null, subFs: !!c.subFs,
        }, extra || {}));
      }
    }
    if (s.mode === 'cw') {
      push('CW', 'Sürekli dalga (t = T)', s.P * s.T, s.T, comps(s.T));
      info.N = null;
      return { list, info };
    }
    if (s.mode === 'sp') {
      push('TD', 'Tek darbe', s.Q, s.tau, comps(s.tau));
      info.N = 1;
      return { list, info };
    }
    const N = pulsesIn(s.T, s.f, s.tau);
    info.N = N;
    push('K1', 'Kural 1 — tek darbe', s.Q, s.tau, comps(s.tau));
    let tauEff = s.tau;
    let qEff = s.Q;
    let fEff = s.f;
    const Tg = A.Tmin(l);
    if (Tg > 0) {
      const nG = s.tau < Tg ? pulsesIn(Tg, s.f, s.tau) : 1;
      info.Ti = Tg;
      info.nTi = nG;
      if (nG >= 2) {
        tauEff = l < 400 ? Math.min(Tg, nG * s.tau) : Tg;
        qEff = nG * s.Q;
        fEff = s.f / nG;
        push('K1', 'Kural 1 — T_min içindeki ' + fmtInt(nG) + ' darbe tek darbe sayılır', qEff, tauEff,
          comps(tauEff).filter((c) => c.thermal), { k: nG });
      }
    }
    push('K2', 'Kural 2 — T içindeki ' + fmtInt(N) + ' darbe', N * s.Q, s.T, comps(s.T), { k: N });
    for (const k of candidateKs(N)) {
      const Tk = (k - 1) / s.f + s.tau;
      if (Tk >= s.T) break;
      push('K2a', 'Kural 2 — ' + fmtInt(k) + ' darbelik alt grup', k * s.Q, Tk, comps(Tk), { k, sub: true });
    }
    if (Tg > 0) {
      const Nr = pulsesIn(s.T, fEff, tauEff);
      const Cp = Nr > 1 ? Math.pow(Nr, -0.25) : 1;
      const why = 'C_P = N^−0,25, N = ' + fmtInt(Nr) + (info.nTi >= 2 ? ' (T_min grupları)' : '') + ' (2006/25/AT Tablo 2.6)';
      info.cp = { Cp, Nexp: Nr, nT2: Nr, tauEff, why };
      if (Cp < 1) {
        for (const c of comps(tauEff).filter((x) => x.thermal)) {
          list.push({
            set: 'AB', rule: 'K3', label: 'Kural 3 — C_P = ' + Cp.toFixed(3).replace('.', ',') + ' ile tek darbe',
            amountJ: qEff, t: tauEff, limitH: Cp * c.H, mech: c.mech, apertureM: c.apertureM, smallBeamPeak: false,
            formula: 'C_P × ' + c.formula, factors: Object.assign({ CP: Cp }, c.factors || {}), cpWhy: why,
          });
        }
      }
    }
    return { list, info };
  }

  /** Seçili setlerin kriterlerini birleştirir. */
  function buildAll(s, target, sets) {
    const list = [];
    const infoBySet = {};
    for (const id of sets) {
      const r = buildCriteria(s, target, id);
      for (const c of r.list) list.push(c);
      infoBySet[id] = r.info;
    }
    return { list, info: infoBySet[sets[0]], infoBySet };
  }

  // ---------------------------------------------------------------------------
  // Değerlendirme (ışın içi, yaygın yansıma)
  // ---------------------------------------------------------------------------

  /** Dürbün/teleskop için geçerli dalga boyu aralığı (IEC 60825-1:2014 Koşul 1). */
  const OAV_MIN_NM = 302.5;
  const OAV_MAX_NM = 4000;

  /**
   * Optik destekli bakış (afokal dürbün/teleskop) maruziyet çarpanı (1/m²).
   * Büyütme M = D_obj / 7 mm (çıkış göz bebeği 7 mm, örn. 7×50 dürbün). Optik, girişte
   * M·D_açıklık çaplı bir bölgeyi gözdeki ölçüm açıklığına taşır (ışınım × M², × τ);
   * giriş bölgesi objektifle sınırlıdır. Retina (7 mm) için etkin giriş açıklığı D_obj
   * (IEC Koşul 1: 50 mm), kornea 1 mm için ≈ 7 mm (IEC Koşul 1: 7 mm) olur.
   * Küçük ışın kuralı olan kriterlerde göze ulaşan (daraltılmış) ışın 1 mm'den
   * küçükse tepe değer de denenir.
   */
  function oavFactor(sec, oav, ap, smallBeamPeak) {
    const M = Math.max(1, oav.D / 7e-3);
    const Deff = Math.min(oav.D, M * ap);
    const A = (Math.PI * ap * ap) / 4;
    let k = (oav.tau * LE.beam.fractionInAperture(sec, Deff)) / A;
    if (smallBeamPeak && sec.dx > 0 && sec.dy > 0) {
      const exit = { profile: sec.profile, dx: Math.min(sec.dx, oav.D) / M, dy: Math.min(sec.dy, oav.D) / M };
      if (Math.min(exit.dx, exit.dy) < 1e-3) {
        const Pc = oav.tau * LE.beam.fractionInAperture(sec, oav.D);
        k = Math.max(k, Pc * LE.beam.peakFactor(exit));
      }
    }
    return k;
  }

  /** Işın içi maruziyet: r mesafesinde tüm kriterlerin oranı. */
  function intrabeamEval(criteria, ctx, r) {
    const sec = LE.beam.sectionAt(ctx.beam, r, ctx.model);
    const att = ctx.mu > 0 ? Math.exp(-ctx.mu * r) : 1;
    // Atmosferik türbülans (sintilasyon) payı: r > 0'da yerel ışınım F katına çıkabilir
    // (türbülans hücrelerinin anlık mercek etkisi); ancak ölçüm açıklığına giren
    // enerji ışının tamamını aşamaz (enerji korunumu) — bu üst sınırla kırpılır.
    const F = ctx.scint > 1 && r > 0 ? ctx.scint : 1;
    const cache = new Map();
    const oavOn = !!(ctx.oav && ctx.oav.on);
    const oavCache = new Map();
    let best = null;
    let bestRatio = -Infinity;
    for (const c of criteria) {
      const key = c.apertureM + (c.smallBeamPeak ? 'p' : 'a');
      let ef = cache.get(key);
      if (!ef) {
        ef = LE.beam.exposureFactor(sec, c.apertureM, c.smallBeamPeak);
        if (F > 1 && !ef.peak) {
          const kCap = 4 / (Math.PI * c.apertureM * c.apertureM);
          ef = Object.assign({}, ef, { k: Math.max(ef.k, Math.min(ef.k * F, kCap)), scint: true });
        }
        cache.set(key, ef);
      }
      let k = ef.k;
      let viaOptics = false;
      if (oavOn && c.oavApplies) {
        let ko = oavCache.get(key);
        if (ko === undefined) {
          ko = oavFactor(sec, ctx.oav, c.apertureM, c.smallBeamPeak);
          // türbülans payı dürbünle bakışta da uygulanır (toplanan gücün tamamı üst sınır)
          if (F > 1) ko = Math.max(ko, Math.min(ko * F, (ctx.oav.tau * 4) / (Math.PI * c.apertureM * c.apertureM)));
          oavCache.set(key, ko);
        }
        if (ko > k) {
          k = ko;
          viaOptics = true;
        }
      }
      const ratio = (c.amountJ * k * att) / c.limitH;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = { c, ratio, X: c.amountJ * k * att, peak: ef.peak, frac: ef.frac, viaOptics };
      }
    }
    return { ratio: bestRatio, gov: best, sec };
  }

  /** Yaygın (Lambert) yansıma: r mesafesindeki oran. */
  function diffuseEval(criteria, d, r) {
    const g = (d.rho * Math.cos(d.theta)) / (Math.PI * r * r);
    const att = d.mu > 0 ? Math.exp(-d.mu * r) : 1;
    let best = null;
    let bestRatio = -Infinity;
    for (const c of criteria) {
      const ratio = (c.amountJ * g * att) / c.limitH;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = { c, ratio, X: c.amountJ * g * att };
      }
    }
    return { ratio: bestRatio, gov: best };
  }

  /** oran(r) azalan bir fonksiyon için oran = 1 noktası. */
  function solveDistance(ratioAt, rMin) {
    const r0 = rMin || 0;
    if (!(ratioAt(r0) > 1)) return { d: 0, inf: false };
    let lo = r0;
    let hi = Math.max(1, r0 * 2);
    while (ratioAt(hi) > 1) {
      lo = hi;
      hi *= 4;
      if (hi > 4e9) return { d: Infinity, inf: true };
    }
    for (let i = 0; i < 200; i++) {
      const mid = lo > 0 ? Math.sqrt(lo * hi) : hi / 2;
      if (ratioAt(mid) > 1) lo = mid; else hi = mid;
      if (hi - lo <= 1e-10 * hi) break;
    }
    return { d: hi, inf: false };
  }

  function od(ratio) {
    return ratio > 1 ? Math.log10(ratio) : 0;
  }

  // ---------------------------------------------------------------------------
  // Ana analiz
  // ---------------------------------------------------------------------------

  /**
   * @param {object} inp normalize edilmiş giriş (SI). Bkz. LE.analysis.schema.
   */
  function analyze(inp) {
    const errors = [];
    const warnings = [];
    const notes = [];
    const l = inp.lambda;
    const mode = inp.mode;
    const out = { version: ENGINE_VERSION, errors, warnings, notes, input: inp };

    if (!(l >= LE.mpe.LAMBDA_MIN && l <= LE.mpe.LAMBDA_MAX)) errors.push('Dalga boyu 180 nm ile 1 000 000 nm (1 mm) arasında olmalı.');
    if (['cw', 'sp', 'rp'].indexOf(mode) < 0) errors.push('Çalışma modu seçilmeli.');

    // --- kaynak büyüklükleri
    let P = NaN; let Q = NaN; let tau = NaN; let f = NaN; let T = NaN;
    if (mode === 'cw') {
      P = inp.P;
      T = inp.T;
      if (!(P > 0)) errors.push('Güç sıfırdan büyük olmalı.');
    } else if (mode === 'sp') {
      Q = inp.Q;
      tau = inp.tau;
      if (!(Q > 0)) errors.push('Darbe enerjisi sıfırdan büyük olmalı.');
      if (!(tau > 0)) errors.push('Darbe süresi sıfırdan büyük olmalı.');
      T = tau;
    } else if (mode === 'rp') {
      tau = inp.tau;
      f = inp.f;
      T = inp.T;
      if (!(tau > 0)) errors.push('Darbe süresi sıfırdan büyük olmalı.');
      if (!(f > 0)) errors.push('Darbe tekrarlama frekansı sıfırdan büyük olmalı.');
      if (inp.Q > 0) { Q = inp.Q; P = Q * f; }
      else if (inp.P > 0) { P = inp.P; Q = P / f; }
      else if (inp.Ppeak > 0) { Q = inp.Ppeak * tau; P = Q * f; }
      else errors.push('Darbe enerjisi, ortalama güç veya tepe güçten biri girilmeli.');
      if (tau > 0 && f > 0 && tau * f >= 1) errors.push('Darbe süresi × frekans ≥ 1: darbeler örtüşüyor. Bu lazeri sürekli dalga (CW) olarak değerlendirin.');
      if (T > 0 && tau > 0 && T < tau) errors.push('Maruziyet süresi darbe süresinden kısa olamaz.');
    }
    if (mode !== 'sp') {
      if (!(T > 0)) errors.push('Maruziyet süresi sıfırdan büyük olmalı.');
      else if (T > LE.mpe.T_MAX * (1 + 1e-9)) errors.push('Maruziyet süresi 30 000 s üstünde tanımlı değil (ICNIRP).');
    }
    if (mode !== 'cw' && tau > LE.mpe.T_MAX) errors.push('Darbe süresi 30 000 s üstünde olamaz.');

    const bm = inp.beam || {};
    if (!(bm.dx >= 0) || !(bm.dy >= 0)) errors.push('Işın çapı negatif olamaz.');
    if (!(bm.phix >= 0) || !(bm.phiy >= 0)) errors.push('Iraksama negatif olamaz.');
    const alpha = inp.alpha > 0 ? inp.alpha : 0;

    if (errors.length) { out.ok = false; return out; }

    const s = { l, mode, Q, P, tau, f, T, alpha, skinAreaM2: inp.skinAreaM2 || 0 };
    const limits = inp.limits === 'icnirp' || inp.limits === 'aord' ? inp.limits : 'both';
    const sets = setsFor(limits);
    out.limits = limits;
    out.sets = sets;
    out.derived = {
      P: mode === 'sp' ? null : P,
      Q: mode === 'cw' ? null : Q,
      Ppeak: mode === 'cw' ? null : Q / tau,
      duty: mode === 'rp' ? tau * f : null,
      T,
      Tdefault: defaultExposure(l),
    };

    // --- düzeltme faktörleri (bilgi)
    const M = LE.mpe;
    out.factors = {
      CA: isRetinal(l) ? M.CA(l) : null,
      CB: l >= 400 && l < 600 ? M.CB(l) : null,
      CC: l >= 700 && l < 1400 ? M.CC(l) : null,
      T1: l >= 400 && l < 600 ? M.T1(l) : null,
      T2: isRetinal(l) ? M.T2(alpha) : null,
      Ti: isRetinal(l) ? M.Ti(l) : null,
      alphaMin: M.ALPHA_MIN,
      alphaMaxT: isRetinal(l) ? M.alphaMax(T) : null,
      CE: isRetinal(l) ? M.CE(alpha, T) : null,
      apertureEye: M.eyeApertureM(l, mode === 'sp' ? tau : T),
      apertureEyePulse: mode === 'rp' ? M.eyeApertureM(l, tau) : null,
      apertureSkin: M.skinApertureM(l),
    };
    if (sets.indexOf('AB') >= 0) {
      const AB = LE.aord;
      out.factors.AB = {
        CA: isRetinal(l) ? AB.CA(l) : null,
        CB: l >= 400 && l < 600 ? AB.CB(l) : null,
        CC: l >= 700 && l < 1400 ? AB.CC(l) : null,
        CE: isRetinal(l) ? AB.CE(alpha) : null,
        T2: isRetinal(l) ? AB.T2(alpha) : null,
        Tmin: AB.Tmin(l) > 0 ? AB.Tmin(l) : null,
        apertureEye: AB.eyeApertureM(l, mode === 'sp' ? tau : T),
        apertureSkin: AB.skinApertureM(l),
      };
    }

    // --- ışın
    const beam = {
      profile: bm.profile || 'gauss',
      dx: bm.dx, dy: bm.dy, phix: bm.phix, phiy: bm.phiy,
    };
    const model = inp.model === 'linear' ? 'linear' : 'quad';
    const mu = inp.mu > 0 ? inp.mu : 0;
    const oavOn = !!(inp.oav && inp.oav.on);
    const oavApplicable = l >= OAV_MIN_NM && l < OAV_MAX_NM;
    if (oavOn && !oavApplicable) warnings.push('Dürbünle bakış bu dalga boyunda hesaba katılmadı: cam optikler 302,5 nm altını ve 4 µm üstünü geçirmez (IEC 60825-1:2014 Koşul 1 aralığı 302,5–4000 nm).');
    const oavD = inp.oav && inp.oav.D > 0 ? inp.oav.D : 0.05;
    const oav = oavOn && oavApplicable
      ? { on: true, D: oavD, M: Math.max(1, oavD / 7e-3), tau: inp.oav.tau > 0 ? inp.oav.tau : (l >= 400 && l < 700 ? 0.9 : 0.7) }
      : { on: false, requested: oavOn, notApplicable: oavOn && !oavApplicable };

    // --- göz kriterleri
    const eyeC = buildAll(s, 'eye', sets);
    for (const c of eyeC.list) c.oavApplies = oav.on;
    const ctx = { beam, model, mu, oav: { on: false } };
    const ctxO = { beam, model, mu, oav };
    const ratioEye = (r) => intrabeamEval(eyeC.list, ctx, r).ratio;
    const ratioEyeO = (r) => intrabeamEval(eyeC.list, ctxO, r).ratio;

    const range = inp.range > 0 ? inp.range : 0;
    const at0 = intrabeamEval(eyeC.list, ctx, 0);
    const atR = intrabeamEval(eyeC.list, oav.on ? ctxO : ctx, range);
    // en kötü durum: tüm enerji sınırlayıcı açıklıktan geçer
    let worst = null;
    const worstBySet = {};
    for (const c of eyeC.list) {
      const A = (Math.PI * c.apertureM * c.apertureM) / 4;
      const ratio = c.amountJ / A / c.limitH;
      if (!worst || ratio > worst.ratio) worst = { c, ratio };
      if (!(worstBySet[c.set] >= ratio)) worstBySet[c.set] = ratio;
    }
    const odWorst = Math.max(od(worst.ratio), od(at0.ratio));
    const nohd = solveDistance(ratioEye, 0);
    const enohd = oav.on ? solveDistance(ratioEyeO, 0) : null;

    out.eye = {
      criteria: eyeC.list,
      info: eyeC.info,
      infoBySet: eyeC.infoBySet,
      summary: summarizeMPE(eyeC.list, s, 'eye'),
      summaryBySet: bySet(eyeC.list, sets, s),
      at0: packEval(at0),
      atRange: Object.assign(packEval(atR), { r: range, oav: oav.on }),
      worst: { ratio: worst.ratio, crit: worst.c, od: odWorst },
      worstBySet,
      odWorst,
      odAtRange: od(atR.ratio),
      nohd: nohd.d,
      nohdInf: nohd.inf,
      enohd: enohd ? enohd.d : null,
      enohdInf: enohd ? enohd.inf : false,
      oav,
    };
    // --- atmosferik türbülans (sintilasyon) payı: ayrı sonuç olarak verilir
    const scintF = inp.scint && inp.scint.on ? (inp.scint.factor > 1 ? inp.scint.factor : 10) : 1;
    out.eye.scint = null;
    if (scintF > 1) {
      const ctxS = { beam, model, mu, oav: { on: false }, scint: scintF };
      const ctxSO = { beam, model, mu, oav, scint: scintF };
      const nS = solveDistance((r) => intrabeamEval(eyeC.list, ctxS, r).ratio, 0);
      const eS = oav.on ? solveDistance((r) => intrabeamEval(eyeC.list, ctxSO, r).ratio, 0) : null;
      const atRS = intrabeamEval(eyeC.list, oav.on ? ctxSO : ctxS, range);
      const plus = Math.ceil(Math.log10(scintF) - 1e-9);
      const rec = Math.ceil(odWorst - 1e-9);
      out.eye.scint = {
        factor: scintF, odPlus: plus,
        nohd: nS.d, nohdInf: nS.inf,
        enohd: eS ? eS.d : null, enohdInf: eS ? eS.inf : false,
        odAtRange: od(atRS.ratio),
        recOD: odWorst > 0 ? rec + plus : 0,
      };
    }
    if (eyeC.infoBySet.ICNIRP && eyeC.infoBySet.ICNIRP.cp) out.factors.CP = eyeC.infoBySet.ICNIRP.cp.Cp;
    if (eyeC.infoBySet.AB && eyeC.infoBySet.AB.cp && out.factors.AB) out.factors.AB.CP = eyeC.infoBySet.AB.cp.Cp;

    // --- deri
    const Tskin = mode === 'sp' ? tau : (inp.Tskin > 0 ? inp.Tskin : 10);
    const sS = Object.assign({}, s, { T: Tskin });
    if (mode === 'rp' && Tskin < tau) sS.T = tau;
    const skinC = buildAll(sS, 'skin', sets);
    const ratioSkin = (r) => intrabeamEval(skinC.list, ctx, r).ratio;
    const sk0 = intrabeamEval(skinC.list, ctx, 0);
    let skWorst = null;
    for (const c of skinC.list) {
      const A = (Math.PI * c.apertureM * c.apertureM) / 4;
      const ratio = c.amountJ / A / c.limitH;
      if (!skWorst || ratio > skWorst.ratio) skWorst = { c, ratio };
    }
    const nshd = solveDistance(ratioSkin, 0);
    out.skin = {
      T: sS.T,
      criteria: skinC.list,
      summary: summarizeMPE(skinC.list, sS, 'skin'),
      summaryBySet: bySet(skinC.list, sets, sS),
      at0: packEval(sk0),
      timesMPE: Math.max(skWorst.ratio, sk0.ratio),
      nshd: nshd.d,
      nshdInf: nshd.inf,
    };

    // --- yaygın yansıma
    if (inp.diffuse) out.diffuse = analyzeDiffuse(inp, s, mu, warnings, sets);

    // --- mercek (lens-on-laser)
    if (inp.lens && inp.lens.f && inp.lens.b > 0) out.lens = analyzeLens(inp, s, eyeC.list, mu, model);

    // --- fiber optik
    if (inp.fiber && (inp.fiber.type === 'single' || inp.fiber.type === 'multi')) {
      out.fiber = analyzeFiber(inp, s, eyeC.list, mu, model, errors);
    }

    // --- göz koruyucu (EN 207 / EN 208)
    if (LE.eyewear) out.eyewear = LE.eyewear.evaluate(inp, s, beam, model, out);

    collectWarnings(out, s, beam, inp);
    out.ok = errors.length === 0;
    return out;
  }

  function packEval(e) {
    return {
      ratio: e.ratio,
      od: od(e.ratio),
      crit: e.gov ? e.gov.c : null,
      X: e.gov ? e.gov.X : null,
      peak: e.gov ? !!e.gov.peak : false,
      frac: e.gov ? e.gov.frac : null,
      viaOptics: e.gov ? !!e.gov.viaOptics : false,
      sec: e.sec || null,
    };
  }

  function bySet(list, sets, s) {
    const o = {};
    for (const id of sets) {
      const l = list.filter((c) => c.set === id);
      if (l.length) o[id] = summarizeMPE(l, s);
    }
    return o;
  }

  /** Kurallara göre MPE özeti (darbe başına / ortalama). */
  function summarizeMPE(list, s, target) {
    // Kurallar arasında açıklık farklı olabileceği için her kural için en düşük sınır gösterilir
    const byRule = {};
    for (const c of list) {
      const perPulse = c.limitH / (c.k || 1);
      const key = c.rule === 'K2a' ? 'K2a' : c.rule;
      const cur = byRule[key];
      if (!cur || perPulse < cur.perPulseH) {
        byRule[key] = { rule: key, crit: c, perPulseH: perPulse };
      }
    }
    let gov = null;
    for (const k in byRule) if (!gov || byRule[k].perPulseH < gov.perPulseH) gov = byRule[k];
    const res = { byRule, governing: gov };
    if (s.mode === 'cw') {
      res.H = gov.crit.limitH;
      res.E = gov.crit.limitH / s.T;
    } else if (s.mode === 'sp') {
      res.H = gov.perPulseH;
      res.E = gov.perPulseH / s.tau;
    } else {
      res.H = gov.perPulseH; // darbe başına
      res.Eavg = gov.perPulseH * s.f; // ortalama ışınım cinsinden
    }
    return res;
  }

  function analyzeDiffuse(inp, s, mu, warnings, sets) {
    sets = sets || ['ICNIRP'];
    const d = inp.diffuse;
    const rho = d.rho >= 0 ? Math.min(1, d.rho) : 1;
    const theta = ((d.thetaDeg || 0) * Math.PI) / 180;
    const Td = s.mode === 'sp' ? s.tau : (d.T > 0 ? Math.max(d.T, s.T) : Math.max(600, s.T));
    const rView = d.r > 0 ? d.r : 0.5;
    const extended = !!d.extended && d.spotD > 0;
    const geom = { rho, theta, mu };
    const sD = Object.assign({}, s, { T: Td });

    function critsAt(r, target) {
      let a = 0;
      if (extended && target === 'eye') a = ((d.spotD * Math.sqrt(Math.max(0, Math.cos(theta)))) / r) * 1000;
      return buildAll(Object.assign({}, sD, { alpha: a }), target, sets).list;
    }
    const fixedEye = extended ? null : critsAt(1, 'eye');
    const fixedSkin = critsAt(1, 'skin');
    const ratioE = (r) => diffuseEval(fixedEye || critsAt(r, 'eye'), geom, r).ratio;
    const ratioS = (r) => diffuseEval(fixedSkin, geom, r).ratio;
    const rMin = 1e-6;
    const nhzE = solveDistance(ratioE, rMin);
    const nhzS = solveDistance(ratioS, rMin);
    const evE = diffuseEval(fixedEye || critsAt(rView, 'eye'), geom, rView);
    const evS = diffuseEval(fixedSkin, geom, rView);
    if (rho * Math.cos(theta) <= 0) warnings.push('Yansıma katsayısı veya açı nedeniyle yaygın yansıma ışınımı sıfır.');
    return {
      T: Td, rho, thetaDeg: d.thetaDeg || 0, r: rView, extended,
      alphaAtR: extended ? ((d.spotD * Math.sqrt(Math.max(0, Math.cos(theta)))) / rView) * 1000 : 0,
      eye: {
        nhz: nhzE.d < rMin * 1.0001 && !(ratioE(rMin) > 1) ? 0 : nhzE.d,
        inf: nhzE.inf,
        odAtR: od(evE.ratio),
        ratioAtR: evE.ratio,
        crit: evE.gov.c,
        summary: summarizeMPE(fixedEye || critsAt(rView, 'eye'), sD, 'eye'),
      },
      skin: {
        nhz: !(ratioS(rMin) > 1) ? 0 : nhzS.d,
        inf: nhzS.inf,
        ratioAtR: evS.ratio,
        crit: evS.gov.c,
        summary: summarizeMPE(fixedSkin, sD, 'skin'),
      },
    };
  }

  function analyzeLens(inp, s, eyeList, mu, model) {
    const L = inp.lens;
    const fl = Math.abs(L.f);
    const profile = L.profile || (inp.beam && inp.beam.profile) || 'gauss';
    const bx = L.b;
    const by = L.by > 0 ? L.by : L.b;
    const m2 = inp.m2 > 1 ? inp.m2 : 1;
    const lam = s.l * 1e-9;
    // odak lekesi (1/e) ≈ 2·M²·λ·f / (π·b)
    const w0x = (2 * m2 * lam * fl) / (Math.PI * bx);
    const w0y = (2 * m2 * lam * fl) / (Math.PI * by);
    // odaktan sonra tam açı: 2·atan(b / 2f) (küçük açıda b/f; ANSI mercek formülü)
    const beam = { profile, dx: w0x, dy: w0y, phix: 2 * Math.atan(bx / (2 * fl)), phiy: 2 * Math.atan(by / (2 * fl)) };
    const ctx = { beam, model, mu, oav: { on: false } };
    const ratio = (r) => intrabeamEval(eyeList, ctx, r).ratio;
    const nohd = solveDistance(ratio, 0);
    const r = L.range > 0 ? L.range : 0;
    const ev = intrabeamEval(eyeList, ctx, r);
    return {
      f: L.f, negative: L.f < 0, beam, nohd: nohd.d, inf: nohd.inf, range: r,
      odAtRange: od(ev.ratio), crit: ev.gov.c, sec: ev.sec,
    };
  }

  function analyzeFiber(inp, s, eyeList, mu, model) {
    const F = inp.fiber;
    const lam = s.l * 1e-9;
    let beam;
    if (F.type === 'single') {
      const mfd = F.MFD > 0 ? F.MFD : 10e-6;
      const phi = (2 * Math.SQRT2 * lam) / (Math.PI * mfd);
      beam = { profile: 'gauss', dx: mfd / Math.SQRT2, dy: mfd / Math.SQRT2, phix: phi, phiy: phi };
    } else {
      const NA = F.NA > 0 ? F.NA : 0.2;
      const phi = (2 * NA) / 1.7; // ANSI: NOHD = (1,7/NA)·√(Φ/(π·MPE)) ile tutarlı (1/e tam açı)
      const core = F.core > 0 ? F.core : 0;
      beam = { profile: 'gauss', dx: core, dy: core, phix: phi, phiy: phi };
    }
    const ctx = { beam, model, mu, oav: { on: false } };
    const ratio = (r) => intrabeamEval(eyeList, ctx, r).ratio;
    const nohd = solveDistance(ratio, 0);
    const r = F.range > 0 ? F.range : 0;
    const ev = intrabeamEval(eyeList, ctx, r);
    return { type: F.type, beam, nohd: nohd.d, inf: nohd.inf, range: r, odAtRange: od(ev.ratio), crit: ev.gov.c };
  }

  function collectWarnings(out, s, beam, inp) {
    const w = out.warnings;
    const n = out.notes;
    const l = s.l;
    const allCrit = out.eye.criteria.concat(out.skin.criteria);
    if (allCrit.some((c) => c.subNs)) w.push('1 ns altı darbe: ICNIRP bu bölgede sınır vermiyor; muhafazakâr geçici yaklaşım (1 ns sınırının %10\'u veya ışınım sınırı) uygulandı.');
    if (allCrit.some((c) => c.subFs)) w.push('100 fs altı darbe: tepe ışınımı 100 fs sınırıyla sınırlandırıldı (ICNIRP önerisi).');
    if (l >= 1250 && l < 1400) w.push('1250–1400 nm: C_C çok büyüdüğü için ön göz segmenti ikili sınırı (2 × deri MPE) uygulanıyor; IEC 60825-1:2014 Tablo A.1 notunu ve güncel literatürü dikkate alın.');
    if (l >= 400 && l < 700 && s.mode !== 'sp' && s.T > 0.25) n.push('Görünür bölgede 0,25 s kazara bakışa karşılık gelir; ' + s.T + ' s kasıtlı/uzun bakış varsayımıdır.');
    if (l >= 400 && l < 700 && s.mode !== 'sp' && s.T < 0.25) w.push('Görünür bölgede maruziyet süresi 0,25 s\'den kısa seçildi; bu, göz kırpma tepkisi süresinden kısa ve muhafazakâr değildir.');
    if (l >= 700 && s.mode !== 'sp' && s.T < 10 && l < 1e6) w.push('Görünmez ışın için önerilen en kısa maruziyet süresi 10 s; daha kısa süre muhafazakâr değildir.');
    const both = out.sets.length > 1;
    const tag = (id) => (both ? (id === 'AB' ? '2006/25/AT — ' : 'ICNIRP — ') : '');
    for (const id of out.sets) {
      const inf = out.eye.infoBySet[id];
      if (!inf) continue;
      if (inf.nTi >= 2) n.push(tag(id) + 'Darbe aralığı ' + (id === 'AB' ? 'T_min' : 'Tᵢ') + ' = ' + LE.units.fmtTime(inf.Ti) + '\'den kısa: bu süre içindeki ' + fmtInt(inf.nTi) + ' darbe tek darbe olarak değerlendirildi.');
      if (inf.cp) n.push(tag(id) + 'Kural 3: ' + inf.cp.why + '.');
    }
    if (both) {
      const g = out.eye.at0.crit || out.eye.worst.crit;
      if (g && g.set === 'AB' && out.eye.odWorst > 0) n.push('Belirleyici sınır 2006/25/AT\'den geliyor (AB/Türkiye işyeri maruziyet sınır değerleri ICNIRP 2013\'ten daha kısıtlayıcı).');
    }
    if (s.alpha > LE.mpe.ALPHA_MIN) n.push('Genişletilmiş kaynak: α = ' + s.alpha + ' mrad, C_E = ' + LE.mpe.CE(s.alpha, s.T).toFixed(2).replace('.', ',') + ' (ICNIRP, t = T)' + (out.sets.indexOf('AB') >= 0 ? ', ' + LE.aord.CE(s.alpha).toFixed(2).replace('.', ',') + ' (2006/25/AT)' : '') + '.');
    const minD = Math.min(beam.dx, beam.dy);
    if ((l < 400 || l >= 1400) && minD < 1e-3 && out.sets.indexOf('ICNIRP') >= 0) n.push('Işın çapı 1 mm\'den küçük: UV/IR göz (t < 0,35 s) ve deri değerlendirmesinde açıklık ortalaması yerine tepe değer kullanıldı (ICNIRP Tablo 5/7 dipnotları).');
    if (out.eye.nohdInf) w.push('Iraksama sıfır (veya çok küçük) ve atmosferik zayıflama yok: NOHD pratikte sonsuz. Işın yolu tamamen kontrol altına alınmalı.');
    if (out.eye.nohd > 1e5 && !out.eye.nohdInf) n.push('NOHD 100 km\'yi aşıyor; atmosferik koşullar ve ışın sapmaları bu mesafede belirleyicidir.');
    if (beam.phix === 0 && beam.phiy === 0 && !out.eye.nohdInf && out.eye.nohd > 0) n.push('Iraksama sıfır: NOHD yalnız atmosferik zayıflamayla sınırlı.');
  }

  LE.analysis = {
    ENGINE_VERSION, SETS, setsFor, analyze, buildCriteria, buildAll, intrabeamEval, diffuseEval, solveDistance,
    pulsesIn, candidateKs, cpFactor, defaultExposure, isRetinal, od, oavFactor, OAV_MIN_NM, OAV_MAX_NM,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
