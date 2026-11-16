/*
 * Lazer Emniyet — sayı ayrıştırma, birim dönüştürme ve Türkçe biçimlendirme
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  // Birim tabloları: SI'ya çarpan
  const UNITS = {
    wavelength: { nm: 1, 'µm': 1000 }, // SI yerine nm tabanı
    power: { W: 1, mW: 1e-3, 'µW': 1e-6, kW: 1e3 },
    energy: { J: 1, mJ: 1e-3, 'µJ': 1e-6, nJ: 1e-9 },
    time: { s: 1, ms: 1e-3, 'µs': 1e-6, ns: 1e-9, ps: 1e-12, fs: 1e-15, dk: 60, sa: 3600 },
    frequency: { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 },
    diameter: { mm: 1e-3, 'µm': 1e-6, cm: 1e-2, m: 1 },
    distance: { m: 1, cm: 1e-2, mm: 1e-3, km: 1e3 },
    angle: { mrad: 1e-3, 'µrad': 1e-6, rad: 1, '°': Math.PI / 180 },
    mrad: { mrad: 1, '°': (Math.PI / 180) * 1000 }, // α için mrad tabanı
    atten: { '1/km': 1e-3, '1/m': 1, '1/cm': 100 },
    percent: { '%': 0.01 },
    deg: { '°': 1 },
    plain: { '': 1 },
  };

  /**
   * Sayı ayrıştırma. Ondalık ayırıcı olarak nokta veya virgül kabul edilir;
   * binlik ayırıcı kabul edilmez. "1,5e-3", "2x10^-4", "3·10⁻⁵" desteklenir.
   * @returns {{ok:boolean, value?:number, error?:string, warning?:string}}
   */
  function parseNumber(raw) {
    if (raw === null || raw === undefined) return { ok: false, error: 'Değer girilmedi.' };
    let s = String(raw).trim();
    if (s === '') return { ok: false, error: 'Değer girilmedi.' };
    // üst simge rakamlar ve eksi
    const sup = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, (c) => sup[c]);
    s = s.replace(/\s+/g, '').replace(/−/g, '-');
    // a×10^b, a*10^b, a·10^b, ax10b
    s = s.replace(/(?:[x×*·]10\^?)([+-]?\d+)$/i, 'e$1');
    if (/^[+-]?10\^([+-]?\d+)$/.test(s)) s = s.replace(/^([+-]?)10\^/, '$11e');
    const seps = (s.match(/[.,]/g) || []).length;
    if (seps > 1) return { ok: false, error: 'Birden fazla ayırıcı: binlik ayırıcı kullanmayın (örn. 1000 veya 1e3).' };
    let warning;
    if (/^[+-]?\d{1,3}[.,]\d{3}$/.test(s)) {
      warning = '"' + raw + '" ondalık sayı olarak yorumlandı; binlik ayırıcı değildir.';
    }
    s = s.replace(',', '.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return { ok: false, error: 'Geçersiz sayı biçimi.' };
    const v = Number(s);
    if (!Number.isFinite(v)) return { ok: false, error: 'Sayı aralık dışında.' };
    return warning ? { ok: true, value: v, warning } : { ok: true, value: v };
  }

  function toSI(value, kind, unit) {
    const t = UNITS[kind];
    if (!t || !(unit in t)) throw new Error('Bilinmeyen birim: ' + kind + '/' + unit);
    return value * t[unit];
  }

  function fromSI(value, kind, unit) {
    return value / UNITS[kind][unit];
  }

  // ---------------------------------------------------------------------------
  // Biçimlendirme (Türkçe: ondalık virgül)
  // ---------------------------------------------------------------------------

  const SUP = { '-': '⁻', '+': '', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

  function supExp(n) {
    return String(n).split('').map((c) => SUP[c]).join('');
  }

  /** Anlamlı basamakla sayı. Çok küçük/büyükte bilimsel gösterim (×10ⁿ). */
  function fmt(v, sig) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (v === Infinity) return '∞';
    if (v === -Infinity) return '−∞';
    sig = sig || 3;
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e-3 && a < 1e6) {
      const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(a)));
      let s = v.toFixed(Math.min(digits, 12));
      // gereksiz sıfırları bırak ama en az anlamlı basamak koru
      if (s.indexOf('.') >= 0 && digits > 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return grp(s.replace('-', '−'));
    }
    const e = Math.floor(Math.log10(a));
    let m = v / Math.pow(10, e);
    let ms = m.toFixed(sig - 1);
    if (Math.abs(Number(ms)) >= 10) { ms = (m / 10).toFixed(sig - 1); return ms.replace('.', ',').replace('-', '−') + '×10' + supExp(e + 1); }
    return ms.replace('.', ',').replace('-', '−') + '×10' + supExp(e);
  }

  /** Tamsayı kısmında binlik grup (ince boşluk), ondalık virgül. */
  function grp(s) {
    const neg = s[0] === '−';
    if (neg) s = s.slice(1);
    const [i, d] = s.split('.');
    const ig = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : i;
    return (neg ? '−' : '') + ig + (d !== undefined ? ',' + d : '');
  }

  /** Ön ekli otomatik birim: fmtPrefixed(2.5e-3, 'J') → "2,50 mJ" */
  function fmtPrefixed(v, base, sig) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (v === 0) return '0 ' + base;
    if (!Number.isFinite(v)) return fmt(v) + ' ' + base;
    const P = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f']];
    const a = Math.abs(v);
    for (const [f, p] of P) {
      if (a >= f * 0.9995) return fmt(v / f, sig) + ' ' + p + base;
    }
    return fmt(v, sig) + ' ' + base;
  }

  function fmtTime(t) {
    if (!(t > 0)) return fmt(t);
    if (t >= 3600) return fmt(t, 4) + ' s (' + fmt(t / 3600, 3) + ' sa)';
    if (t >= 0.1) return fmt(t, 4) + ' s';
    return fmtPrefixed(t, 's');
  }

  function fmtDist(m, sig) {
    if (m === Infinity) return '∞';
    if (!(m > 0)) return '0 m';
    if (m >= 1000) return fmt(m / 1000, sig || 3) + ' km';
    if (m < 0.01) return fmt(m * 1000, sig || 3) + ' mm';
    if (m < 1) return fmt(m * 100, sig || 3) + ' cm';
    return fmt(m, sig || 3) + ' m';
  }

  function fmtOD(x) {
    if (!(x > 0)) return '0';
    return x.toFixed(2).replace('.', ',');
  }

  LE.units = { UNITS, parseNumber, toSI, fromSI, fmt, fmtPrefixed, fmtTime, fmtDist, fmtOD, supExp };
})(typeof globalThis !== 'undefined' ? globalThis : this);
