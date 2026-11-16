/*
 * Lazer Emniyet — sonuçların gösterimi (özet, grafik, tablolar)
 *
 * Metinler T() (arayüz) ve X() (hesap motoru metni) ile seçili dile çevrilir. Yöntem açıklamaları
 * dokununca açılan kutulardadır (more()); uyarılar her zaman görünür.
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});
  const U = LE.units;
  const T = (s, ...a) => (LE.i18n ? LE.i18n.T(s, ...a) : s.replace(/\{(\d+)\}/g, (m, i) => a[i]));
  const X = (s) => (LE.i18n ? LE.i18n.X(s) : s);

  const MECH = {
    'retina-termal': 'Retina — termal',
    'retina-fotokimyasal': 'Retina — fotokimyasal (mavi ışık)',
    'kornea-UV-fotokimyasal': 'Kornea — UV fotokimyasal',
    'kornea-UV-termal': 'Kornea — UV termal',
    'kornea-UV': 'Kornea — UV',
    'kornea-IR': 'Kornea — IR termal',
    'on-segment': 'Göz ön bölümü (deri sınırı, ikili)',
    'kornea-lens': 'Kornea/lens (ANSI 2014 K_λ, ikili)',
    deri: 'Deri',
    'deri-UV-fotokimyasal': 'Deri — UV fotokimyasal',
    'deri-UV-termal': 'Deri — UV termal',
    'deri-UV': 'Deri — UV',
    'deri-IR': 'Deri — IR',
  };
  const SETNAME = { ICNIRP: 'ICNIRP 2013', AB: '2006/25/AT' };
  const setName = (id) => (SETNAME[id] ? T(SETNAME[id]) : id || '');

  const RULE = {
    CW: 'Sürekli dalga',
    TD: 'Tek darbe',
    K1: 'Kural 1',
    K2: 'Kural 2',
    K2a: 'Kural 2 (alt grup)',
    K3: 'Kural 3 (C_P)',
  };
  const rule = (r) => (RULE[r] ? T(RULE[r]) : r);

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const mech = (m) => (MECH[m] ? T(MECH[m]) : m);

  /** Açıklamalar: "dokununca" (varsayılan) kapalı, "her zaman" ayarında açık gelir. */
  function more(html, summary) {
    const open = LE.prefs && LE.prefs.help === 'always';
    return '<details class="more"' + (open ? ' open' : '') + '><summary>' + (summary || T('Açıklama')) + '</summary>' + html + '</details>';
  }

  /** H (J/m²) ve süre t için "H J/m² (E W/m²)" ve ANSI karşılığı. */
  function limitText(H, t) {
    const E = H / t;
    return U.fmt(H) + ' J/m² · ' + U.fmt(E) + ' W/m²';
  }

  function ansi(H, t) {
    return U.fmt(H * 1e-4) + ' J/cm² · ' + U.fmt((H / t) * 1e-4) + ' W/cm²';
  }

  function tile(cls, k, v, s, small) {
    return '<div class="tile ' + cls + '"><div class="k">' + k + '</div><div class="v' + (small ? ' sm' : '') + '">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  }

  function distOrNone(d, inf) {
    if (inf || d === Infinity) return T('∞ (sınırsız)');
    if (!(d > 0)) return T('Yok');
    return U.fmtDist(d);
  }

  // ---------------------------------------------------------------------------
  function render(container, out, ctx) {
    if (!out || !out.ok) {
      const errs = ((out && out.errors) || []).map(X);
      container.innerHTML = '<div class="verdict err"><h2>' + T('Hesap yapılamadı') + '</h2><p>' + T('Girişlerdeki hataları düzeltin:') + '</p><ul class="msgs">' +
        (ctx.formErrors || []).concat(errs).map((e) => '<li class="err">' + esc(e) + '</li>').join('') + '</ul></div>';
      return;
    }
    const o = out;
    const parts = [];
    parts.push(verdict(o));
    parts.push(tiles(o));
    parts.push('<div class="card chart"><h3>' + T('Mesafeye göre gerekli optik yoğunluk (OD)') + '</h3><div class="body">' + chart(o) + '</div></div>');
    parts.push('<div class="grid2">' + eyewearCard(o) + mpeCard(o) + '</div>');
    parts.push(criteriaCard(o));
    parts.push('<div class="grid2">' + diffuseCard(o) + skinCard(o) + (o.lens ? lensCard(o) : '') + (o.fiber ? fiberCard(o) : '') + factorsCard(o) + derivedCard(o) + '</div>');
    parts.push(messagesCard(o, ctx));
    container.innerHTML = parts.join('');
    attachChart(container.querySelector('.chart .body'), o);
  }

  function verdict(o) {
    const e = o.eye;
    const lines = [];
    let cls = 'ok';
    let title;
    const hazEye = e.at0.ratio > 1 || e.odWorst > 0;
    if (hazEye) {
      cls = 'danger';
      title = T('Doğrudan ışına bakış göz için TEHLİKELİ');
      const worstRatio = Math.max(e.at0.ratio, e.worst.ratio);
      lines.push(worstRatio < 2
        ? T('Maruziyet, MPE\'nin <b>{0} katına</b> kadar çıkabilir (sınırda aşım — yine de kontrol önlemi gerekir).', U.fmt(worstRatio, 3))
        : T('Maruziyet, MPE\'nin <b>{0} katına</b> kadar çıkabilir.', U.fmt(worstRatio, 3)));
      lines.push(e.enohd !== null
        ? T('Göz tehlike mesafesi (NOHD): <b>{0}</b> · dürbünle (ENOHD): <b>{1}</b>.', distOrNone(e.nohd, e.nohdInf), distOrNone(e.enohd, e.enohdInf))
        : T('Göz tehlike mesafesi (NOHD): <b>{0}</b>.', distOrNone(e.nohd, e.nohdInf)));
      if (e.oav.notApplicable) lines.push(T('Dürbünle bakış seçildi ancak bu dalga boyunda hesaba katılmadı (cam optikler 302,5 nm altını ve 4 µm üstünü geçirmez).'));
      const ewTxt = (o.eyewear ? ': <b class="mono">' + esc(o.eyewear.marking) + '</b>' : '') + T(' (en az OD {0})', LE.eyewear.recommendedOD(e.odWorst));
      if (e.nohd > 0 || e.nohdInf) {
        lines.push(T('Bu mesafe içinde lazer kontrollü alan ve uygun göz koruyucu gereklidir{0}.', ewTxt));
      } else if (e.enohd > 0 || e.enohdInf) {
        lines.push(T('Çıplak gözle doğrudan bakışta MPE aşılmıyor; dürbünle bakışta ENOHD içinde aşılır. Bu mesafe içinde optik destekli bakış engellenmeli ya da göz koruyucu kullanılmalıdır{0}.', ewTxt));
      } else {
        // en kötü durum (tüm güç ölçüm açıklığında) MPE'yi aşıyor, gerçek ışın aşmıyor
        lines.push(T('Işın ölçüm açıklığından (göz bebeğinden) geniş olduğu için çıplak gözle doğrudan bakışta MPE aşılmıyor; ışın daraltılır ya da odaklanırsa (tüm güç göz bebeğine girerse) aşılır. Bu durumlar için göz koruyucu{0}.', ewTxt));
      }
      if (e.scint) {
        lines.push(T('Atmosferik türbülans (sintilasyon) payıyla (+{0} OD): önerilen en az <b>OD {1}</b>{2}; tehlike mesafesi <b>{3}</b>{4}.',
          e.scint.odPlus, e.scint.recOD,
          o.eyewear && o.eyewear.markingScint ? ', EN 207 <b class="mono">' + esc(o.eyewear.markingScint) + '</b>' : '',
          distOrNone(e.scint.nohd, e.scint.nohdInf),
          e.scint.enohd !== null ? T(' (dürbünle {0})', distOrNone(e.scint.enohd, e.scint.enohdInf)) : ''));
      }
      const gc = e.worst.ratio >= e.at0.ratio ? e.worst.crit : e.at0.crit;
      if (o.sets.length > 1 && gc) {
        const ri = (e.worstBySet || {}).ICNIRP;
        const ra = (e.worstBySet || {}).AB;
        if (ri > 0 && ra > 0 && Math.abs(Math.log10(ri / ra)) < 0.002) {
          lines.push(T('Belirleyici sınır: <b>iki sette aynı</b> (ICNIRP 2013 ve 2006/25/AT) — {0}, {1}.', esc(rule(gc.rule)), esc(mech(gc.mech))));
        } else {
          const k = ri > 0 && ra > 0 ? Math.max(ri, ra) / Math.min(ri, ra) : null;
          const lead = ri > ra ? 'ICNIRP' : 'AB';
          lines.push(T('Belirleyici sınır: <b>{0}</b> — {1}, {2}{3}.', setName(gc.set), esc(rule(gc.rule)), esc(mech(gc.mech)),
            k && lead === gc.set ? T(' (diğer setten {0} kat daha kısıtlayıcı)', U.fmt(k, 3)) : ''));
        }
      }
    } else {
      title = T('Doğrudan ışın, seçilen maruziyet süresi için MPE\'nin altında');
      lines.push(T('Çıkışta MPE oranı {0} (≤ 1). Daha uzun bakış süreleri için süreyi artırarak kontrol edin.', U.fmt(e.at0.ratio, 3)));
    }
    if (o.diffuse && o.diffuse.eye.nhz > 0) {
      if (cls === 'ok') cls = 'warn';
      lines.push(T('Yaygın yansımalar <b>{0}</b> mesafeye kadar göz için tehlikeli (ρ = {1}, {2}).', distOrNone(o.diffuse.eye.nhz, o.diffuse.eye.inf), U.fmtPct(o.diffuse.rho), U.fmtTime(o.diffuse.T)));
    }
    if (o.skin.timesMPE > 1) {
      if (cls === 'ok') cls = 'warn';
      lines.push(T('Deri için tehlikeli: deri MPE\'sinin {0} katı; deri tehlike mesafesi (NSHD) <b>{1}</b>.', U.fmt(o.skin.timesMPE, 3), distOrNone(o.skin.nshd, o.skin.nshdInf)));
    }
    return '<div class="verdict ' + cls + '"><h2>' + title + '</h2>' + lines.map((l) => '<p>' + l + '</p>').join('') + '</div>';
  }

  function tiles(o) {
    const e = o.eye;
    const s = e.summary;
    const t = [];
    t.push(tile(e.nohd > 0 ? 'danger' : 'ok', T('Göz — NOHD'), distOrNone(e.nohd, e.nohdInf),
      (e.enohd !== null ? T('Dürbünle ENOHD: {0}', distOrNone(e.enohd, e.enohdInf)) : (e.oav.notApplicable ? T('Dürbün: bu dalga boyunda uygulanmaz') : T('Çıplak gözle doğrudan bakış'))) +
      (e.scint && e.nohd > 0 ? T(' · türbülans payıyla {0}', distOrNone(e.scint.nohd, e.scint.nohdInf)) + (e.scint.enohd !== null ? T(' (dürbünle {0})', distOrNone(e.scint.enohd, e.scint.enohdInf)) : '') : '')));
    t.push(tile(e.odWorst > 0 ? 'danger' : 'ok', T('Gerekli OD (en kötü durum)'), U.fmtOD(e.odWorst),
      T('Önerilen en az OD {0}', LE.eyewear.recommendedOD(e.odWorst)) +
      (e.scint && e.odWorst > 0 ? T(' · türbülans payıyla (+{0}) OD {1}', e.scint.odPlus, e.scint.recOD) : '') + ' · ' +
      (e.atRange.r > 0 ? T('{0} mesafede OD {1}', U.fmtDist(e.atRange.r, 3), U.fmtOD(e.odAtRange)) : T('çıkışta OD {0}', U.fmtOD(e.odAtRange)))));
    if (o.eyewear) {
      t.push(tile(o.eyewear.en207.some((i) => i.over) ? 'danger' : 'info', T('EN 207 koruma seviyesi'),
        esc(o.eyewear.marking) + (o.eyewear.markingScint && e.odWorst > 0 ? '<div class="s">' + T('türbülans payıyla: {0}', esc(o.eyewear.markingScint)) + '</div>' : ''),
        o.eyewear.en208 ? (o.eyewear.en208.applicable ? T('EN 208 ayar gözlüğü: RB{0}', o.eyewear.en208.rb) : T('EN 208: uygun değil')) : T('Gözlükteki ışın çapı: {0} mm', U.fmt(o.eyewear.sec.dx * 1e3, 3)), true));
    }
    const g = s.governing;
    let mpeV;
    let mpeS;
    if (o.input.mode === 'cw') { mpeV = U.fmt(s.E) + ' W/m²'; mpeS = U.fmt(s.E * 1e-4) + ' W/cm² · t = ' + U.fmtTime(o.derived.T); }
    else if (o.input.mode === 'sp') { mpeV = U.fmt(s.H) + ' J/m²'; mpeS = U.fmt(s.H * 1e-4) + ' J/cm² · τ = ' + U.fmtTime(o.input.tau); }
    else { mpeV = U.fmt(s.H) + ' J/m²'; mpeS = T('darbe başına · {0} J/cm² · {1}', U.fmt(s.H * 1e-4), rule(g.rule)); }
    t.push(tile('info', T('Göz MPE (belirleyici)'), mpeV, mpeS + ' · ' + esc(mech(g.crit.mech)) + ' · ' + setName(g.crit.set), true));
    if (o.diffuse) t.push(tile(o.diffuse.eye.nhz > 0 ? 'warn' : 'ok', T('Yaygın yansıma NHZ (göz)'), distOrNone(o.diffuse.eye.nhz, o.diffuse.eye.inf), T('{0}\'de OD {1}', U.fmtDist(o.diffuse.r), U.fmtOD(o.diffuse.eye.odAtR))));
    t.push(tile(o.skin.timesMPE > 1 ? 'warn' : 'ok', T('Deri'), o.skin.timesMPE > 1 ? U.fmt(o.skin.timesMPE, 3) + ' × MPE' : T('MPE altında'), 'NSHD: ' + distOrNone(o.skin.nshd, o.skin.nshdInf) + ' · t = ' + U.fmtTime(o.skin.T)));
    return '<div class="tiles">' + t.join('') + '</div>';
  }

  // ---------------------------------------------------------------------------
  // Grafik: OD(r)
  // ---------------------------------------------------------------------------
  // Grafik geometrisi (çizim ve etkileşimli okuma ortak kullanır)
  const CH = { W: 760, H: 274, L: 46, R: 14, T: 12, B: 48, OD_MIN: -1, R_MIN: 0.1, N: 140 };

  /** Grafiğin mesafe aralığının üst ucu (m). */
  function chartRange(o) {
    const inp = o.input;
    const e = o.eye;
    const nohd = e.nohdInf ? 1e6 : e.nohd;
    const en = e.enohd !== null ? (e.enohdInf ? 1e6 : e.enohd) : 0;
    const ns = e.scint ? (e.scint.nohdInf ? 1e6 : e.scint.nohd) : 0;
    return Math.min(Math.max(10, nohd * 3, en * 1.5, ns * 1.5, (inp.range || 0) * 2), 1e7);
  }

  /**
   * Grafikteki eğriler, arkadan öne çizim sırasıyla. Her biri r mesafesindeki
   * maruziyet / MPE oranını motordan hesaplar (çizim ve okuma aynı kaynaktan).
   */
  function chartSeries(o) {
    const inp = o.input;
    const e = o.eye;
    const A = LE.analysis;
    const ctx = { beam: inp.beam, model: inp.model === 'linear' ? 'linear' : 'quad', mu: inp.mu || 0, oav: { on: false } };
    const list = [{ key: 'skin', label: T('Deri (göstergesel)'), color: 'var(--warn)', dash: '2 4', style: 'dotted', width: 2,
      ratio: (r) => A.intrabeamEval(o.skin.criteria, ctx, r).ratio }];
    if (e.scint) {
      const c = Object.assign({}, ctx, { scint: e.scint.factor });
      list.push({ key: 'scint', label: T('Göz, türbülans payıyla (+{0} OD)', e.scint.odPlus), color: 'var(--scint)', dash: '3 3', style: 'dotted', width: 2,
        ratio: (r) => A.intrabeamEval(e.criteria, c, r).ratio });
    }
    if (e.oav.on) {
      const c = Object.assign({}, ctx, { oav: e.oav });
      list.push({ key: 'oav', label: T('Göz, dürbünle'), color: 'var(--accent)', dash: '7 5', style: 'dashed', width: 2.2,
        ratio: (r) => A.intrabeamEval(e.criteria, c, r).ratio });
    }
    list.push({ key: 'eye', label: T('Göz, çıplak gözle'), color: 'var(--danger)', dash: '', style: 'solid', width: 2.8,
      ratio: (r) => A.intrabeamEval(e.criteria, ctx, r).ratio });
    return list;
  }

  /** Okuma metni: MPE aşılıyorsa gereken OD, aşılmıyorsa maruziyetin MPE'ye oranı. */
  function readoutText(ratio) {
    if (!(ratio > 0)) return T('MPE altında');
    const v = Math.log10(ratio);
    if (v > 0) return 'OD ' + (v < 0.01 ? '< ' + U.fmtOD(0.01) : U.fmtOD(v));
    // MPE'nin hemen altındaki değer "1 × MPE" diye yuvarlanmaz
    return T('MPE altında ({0} × MPE)', U.fmt(Math.min(ratio, 0.99), 2));
  }

  /**
   * r mesafesinde grafikteki her eğrinin değeri (öndeki eğri önce): etkileşimli okuma.
   * @returns {Array} { key, label, color, style, ratio, od (≥ 0), text }
   */
  function chartReadout(o, r) {
    return chartSeries(o).reverse().map((s) => {
      const ratio = s.ratio(r);
      return { key: s.key, label: s.label, color: s.color, style: s.style, ratio, od: LE.analysis.od(ratio), text: readoutText(ratio) };
    });
  }

  function chart(o) {
    const inp = o.input;
    const e = o.eye;
    const { W, H, L, R, B, OD_MIN, N } = CH;
    const TOP = CH.T;
    const rMin = CH.R_MIN;
    const rMax = chartRange(o);
    // Eğriler log10(maruziyet / MPE) olarak çizilir ve sıfırda kesilmez: sıfırın üstü gereken OD,
    // altı (OD_MIN = −1, yani 0,1 × MPE'ye kadar) "MPE altında" bandıdır. Böylece her eğrinin
    // sıfır çizgisini kestiği yer tehlike mesafesi işaretiyle görsel olarak çakışır; OD'nin
    // sıfıra çok yakın seyrettiği bölgeler (ör. 1 mW He-Ne'de OD 0,009) sıfırla karışmaz.
    const lg = (ratio) => (ratio > 0 ? Math.max(OD_MIN, Math.log10(ratio)) : OD_MIN);
    const defs = chartSeries(o);
    const series = defs.map(() => []);
    let odMax = 0.5;
    for (let i = 0; i <= N; i++) {
      const r = rMin * Math.pow(rMax / rMin, i / N);
      defs.forEach((s, k) => {
        const v = lg(s.ratio(r));
        series[k].push([r, v]);
        odMax = Math.max(odMax, v);
      });
    }
    odMax = Math.ceil(odMax + 0.25);
    const x = (r) => L + ((Math.log10(r) - Math.log10(rMin)) / (Math.log10(rMax) - Math.log10(rMin))) * (W - L - R);
    const y = (v) => TOP + (1 - (v - OD_MIN) / (odMax - OD_MIN)) * (H - TOP - B);
    const svg = [];
    svg.push('<svg class="odchart" viewBox="0 0 ' + W + ' ' + H + '" data-odmax="' + odMax + '" role="img" aria-label="' + esc(T('Mesafeye göre gerekli optik yoğunluk grafiği. Değer okumak için fareyle üzerine gelin, dokunun ya da odaklanıp ok tuşlarını kullanın.')) + '">');
    // MPE altı bandı (sıfırın altı)
    svg.push('<rect class="safe-band" x="' + L + '" y="' + y(0) + '" width="' + (W - L - R) + '" height="' + (y(OD_MIN) - y(0)) + '" fill="var(--ok-bg)"/>');
    // ızgara — logaritmik mesafe ekseni (logaritmik kâğıt gibi): 10 katları koyu ve etiketli, 2…9 katları
    // soluk; on kat başına yer yetiyorsa 2 ve 5 katları, daha dar eksende 3 katları da etiketlenir.
    const perDecade = (W - L - R) / (Math.log10(rMax) - Math.log10(rMin));
    const minorLabels = perDecade >= 125 ? [2, 5] : perDecade >= 95 ? [3] : [];
    for (let d = Math.floor(Math.log10(rMin)); d <= Math.ceil(Math.log10(rMax)); d++) {
      for (let m = 1; m <= 9; m++) {
        const v = m * Math.pow(10, d);
        if (v < rMin * (1 - 1e-9) || v > rMax * (1 + 1e-9)) continue;
        const xx = x(v);
        svg.push('<line x1="' + xx + '" y1="' + TOP + '" x2="' + xx + '" y2="' + (H - B) + '" stroke="var(--line)" stroke-width="1"' + (m === 1 ? '' : ' stroke-opacity="0.45"') + '/>');
        if (m !== 1 && !minorLabels.includes(m)) continue;
        const label = U.fmtDist(v);
        const atEdge = xx + label.length * 3.2 > W - 1; // sağ kenara taşacak etiket
        if (atEdge && m !== 1) continue;
        svg.push('<text x="' + (atEdge ? W - 1 : xx) + '" y="' + (H - B + 16) + '" font-size="11" text-anchor="' + (atEdge ? 'end' : 'middle') + '" fill="var(--muted)">' + label + '</text>');
      }
    }
    svg.push('<text x="' + (L + (W - L - R) / 2) + '" y="' + (H - 6) + '" font-size="11" text-anchor="middle" fill="var(--muted)">' + T('Mesafe (logaritmik ölçek)') + '</text>');
    const step = odMax > 10 ? 2 : 1;
    for (let v = 0; v <= odMax; v += step) {
      const yy = y(v);
      svg.push('<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy + '" stroke="' + (v === 0 ? 'var(--ok)' : 'var(--line)') + '" stroke-width="1"/>');
      svg.push('<text x="' + (L - 6) + '" y="' + (yy + 4) + '" font-size="11" text-anchor="end" fill="var(--muted)">' + v + '</text>');
    }
    const yMid = (TOP + y(0)) / 2;
    svg.push('<text x="12" y="' + yMid + '" font-size="11" fill="var(--muted)" transform="rotate(-90 12 ' + yMid + ')" text-anchor="middle">' + T('Gerekli OD') + '</text>');
    svg.push('<text x="' + (L + 6) + '" y="' + ((y(0) + y(OD_MIN)) / 2 + 4) + '" font-size="11" fill="var(--ok)" stroke="var(--ok-bg)" stroke-width="3" paint-order="stroke">' + T('MPE altında — koruma gerekmez') + '</text>');
    // bandın altına inen kısım çizilmez (eğri bandın alt kenarından çıkar)
    const path = (pts, color, dash, wdt) => {
      let d = '';
      let pen = false;
      for (let i = 0; i < pts.length; i++) {
        const low = (j) => j < 0 || j >= pts.length || pts[j][1] <= OD_MIN;
        if (low(i) && low(i - 1) && low(i + 1)) {
          pen = false;
          continue;
        }
        d += (pen ? 'L' : 'M') + x(pts[i][0]).toFixed(1) + ' ' + y(pts[i][1]).toFixed(1) + ' ';
        pen = true;
      }
      return d ? '<path d="' + d.trim() + '" fill="none" stroke="' + color + '" stroke-width="' + (wdt || 2.5) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>' : '';
    };
    defs.forEach((s, k) => svg.push(path(series[k], s.color, s.dash, s.width)));
    // tehlike mesafesi işaretleri: her biri kendi eğrisinin sıfır (MPE) çizgisini kestiği yer (sonsuz olanlar çizilmez)
    const marks = [
      { d: e.nohdInf ? null : e.nohd, label: 'NOHD', color: 'var(--danger)' },
      { d: e.enohd !== null && !e.enohdInf ? e.enohd : null, label: T('ENOHD (dürbün)'), color: 'var(--accent)' },
      { d: e.scint && !e.scint.nohdInf ? e.scint.nohd : null, label: T('NOHD (türbülans +{0} OD)', e.scint ? e.scint.odPlus : 1), color: 'var(--scint)' },
    ];
    let row = 0;
    for (const m of marks) {
      if (!(m.d > rMin && m.d < rMax)) continue;
      const xx = x(m.d);
      svg.push('<line class="mark" x1="' + xx + '" y1="' + TOP + '" x2="' + xx + '" y2="' + (H - B) + '" stroke="' + m.color + '" stroke-width="1.5" stroke-dasharray="4 3"/>');
      const right = xx > W - 190;
      svg.push('<text x="' + (right ? xx - 5 : xx + 5) + '" y="' + (TOP + 12 + row * 15) + '" font-size="11.5" fill="' + m.color + '" font-weight="700" stroke="var(--panel)" stroke-width="3" paint-order="stroke" text-anchor="' + (right ? 'end' : 'start') + '">' + m.label + ' ' + U.fmtDist(m.d) + '</text>');
      row++;
    }
    if (inp.range > rMin && inp.range < rMax) {
      // motorun gözlem mesafesi değeriyle aynı bağlam (dürbün açıksa dürbünle); MPE altındaysa bantta
      const obs = defs.find((s) => s.key === (e.oav.on ? 'oav' : 'eye'));
      svg.push('<circle class="obs" cx="' + x(inp.range) + '" cy="' + y(lg(obs.ratio(inp.range))) + '" r="4.5" fill="var(--ink)"/>');
    }
    svg.push('</svg>');
    const legend = '<div class="legend">' + defs.slice().reverse().map((s) => '<span><i style="border-color:' + s.color + (s.style === 'solid' ? '' : ';border-top-style:' + s.style) + '"></i>' + esc(s.label) + '</span>').join('') +
      (inp.range > rMin ? '<span>' + T('● gözlem mesafesi') + '</span>' : '') + '</div>';
    const howTo = more('<p class="note">' + T('Mesafe ekseni logaritmiktir: koyu çizgiler 10 katlar, soluk çizgiler ara değerler. OD de logaritmik bir büyüklüktür (OD 3 = 1000 kat zayıflatma); ışın ölçüm açıklığından büyüdükten sonra mesafe 10 katına çıktıkça OD yaklaşık 2 azalır (1/r²). Eğrinin sıfır çizgisini kestiği yer tehlike mesafesidir; yeşil bant maruziyetin MPE\'nin altında kaldığı bölgedir.') + '</p>', T('Grafik nasıl okunur?'));
    return svg.join('') + legend + howTo;
  }

  /**
   * Grafikte değer okuma: fare, dokunma (sürükleme) ya da klavye (←/→, Shift ile 10 adım,
   * Home/End, Esc) ile seçilen mesafede her eğrinin değeri motordan hesaplanıp gösterilir.
   * Raporun durağan grafiğine eklenmez.
   */
  function attachChart(host, o) {
    if (!host || typeof document === 'undefined') return;
    const svg = host.querySelector('svg.odchart');
    if (!svg) return;
    const { W, H, L, R, B, OD_MIN, N } = CH;
    const TOP = CH.T;
    const rMin = CH.R_MIN;
    const rMax = chartRange(o);
    const odMax = Number(svg.getAttribute('data-odmax')) || 1;
    const lMin = Math.log10(rMin);
    const lMax = Math.log10(rMax);
    const x = (r) => L + ((Math.log10(r) - lMin) / (lMax - lMin)) * (W - L - R);
    const rAt = (px) => Math.pow(10, lMin + ((px - L) / (W - L - R)) * (lMax - lMin));
    const y = (v) => TOP + (1 - (v - OD_MIN) / (odMax - OD_MIN)) * (H - TOP - B);
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };
    const g = el('g', { class: 'hover', 'pointer-events': 'none', visibility: 'hidden' });
    const vline = el('line', { y1: TOP, y2: H - B, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-opacity': 0.6 });
    g.appendChild(vline);
    const dots = {};
    for (const s of chartSeries(o)) {
      dots[s.key] = el('circle', { r: 4, fill: s.color, stroke: 'var(--panel)', 'stroke-width': 1.5 });
      g.appendChild(dots[s.key]);
    }
    svg.appendChild(g);
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    tip.setAttribute('aria-hidden', 'true');
    host.appendChild(tip);
    const live = document.createElement('div');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    host.appendChild(live);
    svg.setAttribute('tabindex', '0');

    const e = o.eye;
    const defaultR = () => (!e.nohdInf && e.nohd > rMin && e.nohd < rMax ? e.nohd : Math.sqrt(rMin * rMax));
    let cur = null;
    function show(r, announce) {
      r = Math.min(rMax, Math.max(rMin, r));
      cur = r;
      const vals = chartReadout(o, r);
      const xx = x(r);
      vline.setAttribute('x1', xx);
      vline.setAttribute('x2', xx);
      for (const v of vals) {
        const d = dots[v.key];
        d.setAttribute('cx', xx);
        d.setAttribute('cy', y(v.ratio > 0 ? Math.max(OD_MIN, Math.log10(v.ratio)) : OD_MIN));
      }
      g.setAttribute('visibility', 'visible');
      tip.innerHTML = '<div class="tip-r">' + esc(U.fmtDist(r)) + '</div>' + vals.map((v) =>
        '<div class="tip-row"><i style="border-color:' + v.color + (v.style === 'solid' ? '' : ';border-top-style:' + v.style) + '"></i><span>' + esc(v.label) + '</span><b>' + esc(v.text) + '</b></div>').join('');
      tip.hidden = false;
      const sr = svg.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      const k = sr.width / W;
      const px = sr.left - hr.left + xx * k;
      const tw = tip.offsetWidth;
      let left = px + 14;
      let top = sr.top - hr.top + (TOP + 2) * k;
      if (left + tw > hr.width) left = px - 14 - tw;
      if (left < 0) {
        // dar ekran: çizginin yanına sığmıyor — eğrileri örtmemek için grafiğin altına
        left = Math.max(0, Math.min(hr.width - tw, px - tw / 2));
        top = sr.bottom - hr.top + 4;
      }
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      if (announce) live.textContent = U.fmtDist(r) + ': ' + vals.map((v) => v.label + ' ' + v.text).join('; ');
    }
    function hide() {
      g.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    }
    let raf = 0;
    let pendingR = null;
    function fromPointer(ev) {
      const sr = svg.getBoundingClientRect();
      const px = ((ev.clientX - sr.left) / sr.width) * W;
      if (px < L || px > W - R) {
        if (ev.pointerType === 'mouse') hide();
        return;
      }
      pendingR = rAt(px);
      if (!raf) {
        const req = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(f, 16);
        raf = req(() => {
          raf = 0;
          show(pendingR, false);
        });
      }
    }
    svg.addEventListener('pointermove', fromPointer);
    svg.addEventListener('pointerdown', fromPointer);
    svg.addEventListener('pointerleave', (ev) => {
      if (ev.pointerType === 'mouse' && document.activeElement !== svg) hide();
    });
    svg.addEventListener('focus', () => {
      if (tip.hidden) show(cur || defaultR(), true);
    });
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', (ev) => {
      const key = ev.key;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].indexOf(key) < 0) return;
      ev.preventDefault();
      if (key === 'Escape') {
        hide();
        return;
      }
      const stepL = ((lMax - lMin) / N) * (ev.shiftKey ? 10 : 1);
      const l0 = Math.log10(cur || defaultR());
      const l = key === 'ArrowLeft' ? l0 - stepL : key === 'ArrowRight' ? l0 + stepL : key === 'Home' ? lMin : lMax;
      show(Math.pow(10, l), true);
    });
  }

  // ---------------------------------------------------------------------------
  function eyewearCard(o) {
    const w = o.eyewear;
    if (!w) return '';
    const rows = w.en207.map((i) => '<tr><td>' + i.mode + '</td><td class="num">' + U.fmt(i.density) + ' ' + i.unit + '</td><td>' + esc(X(i.basis)) + '</td><td class="num"><b>LB' + i.lb + '</b>' + (i.over ? ' ⚠' : '') + '</td></tr>').join('');
    let en208 = '';
    if (w.en208) {
      en208 = '<h4 style="margin:14px 0 4px">' + T('EN 208 — görünür ışın ayar gözlüğü') + '</h4>' +
        (w.en208.applicable ? '<p><span class="marking">RB' + w.en208.rb + '</span></p>' : '<p class="muted">' + T('Uygun değil.') + '</p>') +
        '<p class="note">' + esc(X(w.en208.note)) + '</p>';
    }
    const odW = o.eye.odWorst;
    const where = w.dGiven ? T('elle girilen çap') : (w.r > 0 ? T('{0} mesafedeki çap', U.fmtDist(w.r)) : T('çıkış çapı'));
    return '<div class="card"><h3>' + T('Göz koruyucu seçimi') + '</h3><div class="body">' +
      '<div><span class="marking">' + esc(w.marking) + '</span></div>' +
      more('<p class="note">' + T('EN 207 işaretlemesi: mod harfi, dalga boyu (nm), koruma seviyesi. Gözlük ve çerçeve bu değerlerin <b>tümünü</b> sağlamalıdır.') + '</p>') +
      '<div class="tablewrap"><table class="t"><thead><tr><th>' + T('Mod') + '</th><th>' + T('Yoğunluk') + '</th><th>' + T('Esas') + '</th><th>' + T('Seviye') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="note">' + T('Gözlükteki ışın: {0} {1} mm (1/e), alan {2} mm².', where, U.fmt(w.sec.dx * 1e3, 3) + (w.sec.dy !== w.sec.dx ? ' × ' + U.fmt(w.sec.dy * 1e3, 3) : ''), U.fmt(w.A * 1e6, 3)) + '</p>' +
      en208 +
      '<h4 style="margin:14px 0 4px">' + T('OD (ANSI Z136.1 yöntemi)') + '</h4><table class="t kv"><tbody>' +
      '<tr><td>' + T('En kötü durum (tüm güç açıklıktan)') + '</td><td>' + T('{0} → en az OD {1}', U.fmtOD(odW), LE.eyewear.recommendedOD(odW)) + '</td></tr>' +
      '<tr><td>' + T('Çıkışta (gerçek ışın)') + '</td><td>' + U.fmtOD(o.eye.at0.od) + '</td></tr>' +
      (o.eye.atRange.r > 0 ? '<tr><td>' + T('Gözlem mesafesinde ({0})', U.fmtDist(o.eye.atRange.r)) + '</td><td>' + U.fmtOD(o.eye.odAtRange) + (o.eye.atRange.viaOptics ? T(' (dürbünle)') : '') + '</td></tr>' : '') +
      (o.eye.scint ? '<tr><td>' + T('Atmosferik türbülans (sintilasyon) payı') + '</td><td>' + T('+{0} OD → en az OD {1}', o.eye.scint.odPlus, o.eye.scint.recOD) + (o.eye.atRange.r > 0 ? T('; {0}\'de OD {1}', U.fmtDist(o.eye.atRange.r), U.fmtOD(o.eye.scint.odAtRange)) : '') + '</td></tr>' : '') +
      '</tbody></table>' +
      (w.markingScint ? '<p class="note">' + T('Türbülans payıyla EN 207: <b class="mono">{0}</b> (yoğunluk ×10 → her seviye +1).', esc(w.markingScint)) + '</p>' : '') +
      (o.eye.scint ? more('<p class="note">' + T('Türbülans payı açık havada uzun ışın yolu için muhafazakâr bir eklemedir; ICNIRP 2013 ve ANSI Z136.6-2015 zorunlu tutmaz, İngiltere JSP 390 tehlike mesafesini en çok 2,66 katına çıkarır (≈ +0,85 OD). Ölçüm açıklığına giren güç, ışının toplam gücünü aşamayacağı için mesafeye bağlı değerler bu üst sınırla kırpılır.') + '</p>', T('Türbülans payı hakkında')) : '') +
      w.warnings.concat(w.notes).map((m) => '<p class="note">⚠ ' + esc(X(m)) + '</p>').join('') +
      '</div></div>';
  }

  function mpeCard(o) {
    const s = o.eye.summary;
    const order = ['CW', 'TD', 'K1', 'K2', 'K2a', 'K3'];
    const multi = o.sets.length > 1;
    const rows = [];
    for (const id of o.sets) {
      const ss = o.eye.summaryBySet[id];
      if (!ss) continue;
      if (multi) rows.push('<tr><th colspan="4">' + esc(X(LE.analysis.SETS[id].label)) + '</th></tr>');
      for (const r of order) {
        const b = ss.byRule[r];
        if (!b) continue;
        const c = b.crit;
        const isGov = s.governing.crit === c || (s.governing.rule === r && s.governing.crit.set === id && s.governing.perPulseH === b.perPulseH);
        rows.push('<tr' + (isGov ? ' class="gov"' : '') + '><td>' + rule(r) + (c.k > 1 ? ' <span class="muted">' + T('({0} darbe)', U.fmt(c.k, 3)) + '</span>' : '') + '</td><td class="num">' + U.fmt(b.perPulseH) + '</td><td class="num">' + U.fmt(b.perPulseH * 1e-4) + '</td><td>' + esc(mech(c.mech)) + '</td></tr>');
      }
    }
    const mode = o.input.mode;
    const head = mode === 'rp' ? T('Darbe başına MPE') : 'MPE';
    let extra = '';
    if (mode === 'rp') extra = '<p class="note">' + T('Ortalama ışınım cinsinden: {0} W/m² ({1} W/cm²). Belirleyici: <b>{2} · {3}</b>.', U.fmt(s.Eavg), U.fmt(s.Eavg * 1e-4), rule(s.governing.rule), setName(s.governing.crit.set)) + '</p>';
    if (mode === 'cw') extra = '<p class="note">' + T('{0} için ışınım maruziyeti {1} J/m² ({2} J/cm²) · {3}.', U.fmtTime(o.derived.T), U.fmt(s.H), U.fmt(s.H * 1e-4), setName(s.governing.crit.set)) + '</p>';
    return '<div class="card"><h3>' + T('Göz MPE — kurallara göre') + '</h3><div class="body"><div class="tablewrap"><table class="t"><thead><tr><th>' + T('Kural') + '</th><th>' + head + ' (J/m²)</th><th>(J/cm²)</th><th>' + T('Mekanizma') + '</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' + extra +
      more('<p class="note">' + T('Farklı kurallar ve setler farklı ölçüm açıklıkları kullanabilir (UV/IR); tehlike değerlendirmesi her sınırı kendi açıklığıyla ayrı ayrı uygular.') + '</p>') + '</div></div>';
  }

  function criteriaCard(o) {
    // her kural+mekanizma için en kısıtlayıcı kriteri göster (alt gruplardan yalnız en kötüsü)
    const ctx = { beam: o.input.beam, model: o.input.model === 'linear' ? 'linear' : 'quad', mu: o.input.mu || 0, oav: { on: false } };
    const sec = LE.beam.sectionAt(ctx.beam, 0, ctx.model);
    const rows = [];
    const seen = new Map();
    for (const c of o.eye.criteria) {
      const ef = LE.beam.exposureFactor(sec, c.apertureM, c.smallBeamPeak);
      const ratio = (c.amountJ * ef.k) / c.limitH;
      const key = c.set + '|' + c.rule + '|' + c.mech;
      const prev = seen.get(key);
      if (!prev || ratio > prev.ratio) seen.set(key, { c, ratio, peak: ef.peak });
    }
    const gov = o.eye.at0.crit;
    const multi = o.sets.length > 1;
    for (const { c, ratio, peak } of seen.values()) {
      const isGov = gov && c.set === gov.set && c.rule === gov.rule && c.mech === gov.mech;
      rows.push('<tr class="' + (isGov ? 'gov ' : '') + (ratio > 1 ? 'over' : '') + '">' +
        (multi ? '<td>' + setName(c.set) + '</td>' : '') +
        '<td>' + rule(c.rule) + (c.k > 1 ? '<br><span class="muted">' + T('{0} darbe', U.fmt(c.k, 3)) + '</span>' : '') + '</td>' +
        '<td>' + esc(mech(c.mech)) + '</td>' +
        '<td class="num">' + U.fmtTime(c.t) + '</td>' +
        '<td class="num">' + U.fmt(c.limitH) + '<br><span class="muted">' + U.fmt(c.limitH / c.t) + ' W/m²</span></td>' +
        '<td class="num">' + U.fmt(c.apertureM * 1e3, 3) + ' mm' + (peak ? '<br><span class="muted">' + T('tepe değer') + '</span>' : '') + '</td>' +
        '<td>' + esc(X(c.formula)) + (c.cpWhy ? '<br><span class="muted">' + esc(X(c.cpWhy)) + '</span>' : '') + '</td>' +
        '<td class="num r">' + U.fmt(ratio, 3) + '</td>' +
        '<td class="num">' + U.fmtOD(LE.analysis.od(ratio)) + '</td></tr>');
    }
    return '<div class="card"><h3>' + T('Ayrıntılı değerlendirme — her sınır ayrı (lazer çıkışında)') + '</h3><div class="body"><div class="tablewrap"><table class="t"><thead><tr>' + (multi ? '<th>Set</th>' : '') + '<th>' + T('Kural') + '</th><th>' + T('Mekanizma') + '</th><th>' + T('Zaman tabanı') + '</th><th>' + T('Sınır H (J/m²)') + '</th><th>' + T('Açıklık') + '</th><th>' + T('Formül') + '</th><th>' + T('Maruziyet / MPE') + '</th><th>OD</th></tr></thead><tbody>' +
      rows.join('') + '</tbody></table></div>' + more('<p class="note">' + T('Vurgulu satır çıkışta belirleyici olan sınırdır. Oran &gt; 1 ise o sınır aşılmaktadır.') + '</p>') + '</div></div>';
  }

  function diffuseCard(o) {
    const d = o.diffuse;
    if (!d) return '<div class="card"><h3>' + T('Yaygın yansıma') + '</h3><div class="body"><p class="muted">' + T('Hesaplanmadı (ilgili bölümden açabilirsiniz).') + '</p></div></div>';
    const gs = d.eye.summary.governing;
    const perPulse = o.input.mode === 'rp' ? T(' / darbe') : '';
    return '<div class="card"><h3>' + T('Yaygın (Lambert) yansıma') + '</h3><div class="body"><table class="t kv"><tbody>' +
      '<tr><td>' + T('Göz tehlike mesafesi (NHZ)') + '</td><td><b>' + distOrNone(d.eye.nhz, d.eye.inf) + '</b></td></tr>' +
      '<tr><td>' + T('{0}\'den bakışta gerekli OD', U.fmtDist(d.r)) + '</td><td>' + U.fmtOD(d.eye.odAtR) + '</td></tr>' +
      '<tr><td>' + T('Göz MPE ({0})', U.fmtTime(d.T)) + '</td><td>' + U.fmt(gs.perPulseH) + ' J/m²' + perPulse + '</td></tr>' +
      '<tr><td>' + T('Deri tehlike mesafesi') + '</td><td>' + distOrNone(d.skin.nhz, d.skin.inf) + '</td></tr>' +
      '<tr><td>' + T('Yansıtma · açı') + '</td><td>' + U.fmtPct(d.rho) + ' · ' + U.fmt(d.thetaDeg, 3) + '°</td></tr>' +
      '<tr><td>' + T('Kaynak modeli') + '</td><td>' + (d.extended ? T('Genişletilmiş (α = {0} mrad @ {1})', U.fmt(d.alphaAtR, 3), U.fmtDist(d.r)) : T('Nokta kaynak (muhafazakâr)')) + '</td></tr>' +
      '</tbody></table><p class="note">' + T('Aynasal (parlak) yüzeyler doğrudan ışın gibi değerlendirilmelidir.') + '</p>' +
      more('<p class="note">E = ρ·P·cos θ / (π·r²)</p>', T('Yöntem')) + '</div></div>';
  }

  function skinCard(o) {
    const s = o.skin;
    const g = s.summary.governing;
    const perPulse = o.input.mode === 'rp' ? T(' / darbe') : '';
    return '<div class="card"><h3>' + T('Deri') + '</h3><div class="body"><table class="t kv"><tbody>' +
      '<tr><td>' + T('Deri MPE ({0})', rule(g.rule)) + '</td><td>' + U.fmt(g.perPulseH) + ' J/m²' + perPulse + '</td></tr>' +
      '<tr><td>' + T('MPE katı (en kötü)') + '</td><td><b>' + U.fmt(s.timesMPE, 3) + '</b></td></tr>' +
      '<tr><td>' + T('Deri tehlike mesafesi (NSHD)') + '</td><td>' + distOrNone(s.nshd, s.nshdInf) + '</td></tr>' +
      '<tr><td>' + T('Maruziyet süresi') + '</td><td>' + U.fmtTime(s.T) + '</td></tr>' +
      '<tr><td>' + T('Ölçüm açıklığı') + '</td><td>' + U.fmt(o.factors.apertureSkin * 1e3, 3) + ' mm</td></tr>' +
      '</tbody></table></div></div>';
  }

  function lensCard(o) {
    const L = o.lens;
    return '<div class="card"><h3>' + T('Mercek (lens-on-laser)') + '</h3><div class="body"><table class="t kv"><tbody>' +
      '<tr><td>' + T('Odaktan tehlike mesafesi') + '</td><td><b>' + distOrNone(L.nohd, L.inf) + '</b></td></tr>' +
      '<tr><td>' + T('{0}\'de gerekli OD', U.fmtDist(L.range)) + '</td><td>' + U.fmtOD(L.odAtRange) + '</td></tr>' +
      '<tr><td>' + T('Odaktan sonra ıraksama') + '</td><td>' + U.fmt(L.beam.phix * 1e3, 4) + ' mrad (1/e)</td></tr>' +
      '<tr><td>' + T('Odak lekesi (≈)') + '</td><td>' + U.fmt(L.beam.dx * 1e6, 3) + ' µm</td></tr>' +
      '</tbody></table><p class="note">' + (L.negative ? T('Iraksak mercek: mesafe sanal odak noktasından ölçülür.') : T('Mesafe odak noktasından ölçülür.')) + '</p></div></div>';
  }

  function fiberCard(o) {
    const F = o.fiber;
    return '<div class="card"><h3>' + T('Fiber optik çıkış') + '</h3><div class="body"><table class="t kv"><tbody>' +
      '<tr><td>' + T('Fiber ucundan NOHD') + '</td><td><b>' + distOrNone(F.nohd, F.inf) + '</b></td></tr>' +
      '<tr><td>' + T('{0}\'de gerekli OD', U.fmtDist(F.range)) + '</td><td>' + U.fmtOD(F.odAtRange) + '</td></tr>' +
      '<tr><td>' + T('Iraksama (1/e tam açı)') + '</td><td>' + U.fmt(F.beam.phix * 1e3, 4) + ' mrad</td></tr>' +
      '</tbody></table>' + more('<p class="note">' + (F.type === 'multi' ? T('Çok modlu: ANSI yaklaşımı, NA %5 yoğunluk noktasında (φ₆₃ = 2·NA/1,7).') : T('Tek modlu: Gauss uzak alan, θ = λ/(π·w₀).')) + '</p>', T('Yöntem')) + '</div></div>';
  }

  function factorsCard(o) {
    const f = o.factors;
    const ab = f.AB || null;
    const hasI = o.sets.indexOf('ICNIRP') >= 0;
    const two = hasI && ab;
    const rows = [];
    const add = (k, vi, va) => {
      const a = vi === null || vi === undefined || (typeof vi === 'number' && Number.isNaN(vi)) ? null : vi;
      const b = va === null || va === undefined || (typeof va === 'number' && Number.isNaN(va)) ? null : va;
      if (a === null && b === null) return;
      if (two) rows.push('<tr><td>' + k + '</td><td>' + (a === null ? '—' : a) + '</td><td>' + (b === null ? '—' : b) + '</td></tr>');
      else rows.push('<tr><td>' + k + '</td><td>' + (hasI ? (a === null ? '—' : a) : (b === null ? '—' : b)) + '</td></tr>');
    };
    const n4 = (x) => (x === null || x === undefined ? null : U.fmt(x, 4));
    const tm = (x) => (x === null || x === undefined ? null : U.fmtTime(x));
    const A = ab || {};
    add('C_A', n4(f.CA), n4(A.CA));
    add('C_B', n4(f.CB), n4(A.CB));
    add('C_C', n4(f.CC), n4(A.CC));
    if (o.input.lambda >= 1200 && o.input.lambda < 1400) add(T('K_λ (ANSI, ikili sınır)'), U.fmt(LE.mpe.Klambda(o.input.lambda), 4), null);
    add('C_E (t = T)', n4(f.CE), n4(A.CE));
    add(T('C_P (Kural 3)'), f.CP !== undefined ? n4(f.CP) : null, A.CP !== undefined ? n4(A.CP) : null);
    add('T₁', tm(f.T1), null);
    add('T₂', tm(f.T2), tm(A.T2));
    add(T('Tᵢ / T_min (darbe gruplama)'), tm(f.Ti), tm(A.Tmin));
    add('α_max (T)', f.alphaMaxT !== null ? U.fmt(f.alphaMaxT, 3) + ' mrad' : null, ab && f.alphaMaxT !== null ? T('100 mrad (sabit)') : null);
    add(T('Göz ölçüm açıklığı (T)'), U.fmt(f.apertureEye * 1e3, 3) + ' mm', ab ? U.fmt(A.apertureEye * 1e3, 3) + ' mm' : null);
    if (f.apertureEyePulse !== null) add(T('Göz ölçüm açıklığı (τ)'), U.fmt(f.apertureEyePulse * 1e3, 3) + ' mm', null);
    add(T('Deri ölçüm açıklığı'), U.fmt(f.apertureSkin * 1e3, 3) + ' mm', ab ? U.fmt(A.apertureSkin * 1e3, 3) + ' mm' : null);
    const head = two ? '<thead><tr><th>' + T('Parametre') + '</th><th>ICNIRP 2013</th><th>' + setName('AB') + '</th></tr></thead>' : '';
    return '<div class="card"><h3>' + T('Düzeltme faktörleri ve parametreler') + '</h3><div class="body"><table class="t kv">' + head + '<tbody>' + rows.join('') + '</tbody></table></div></div>';
  }

  function derivedCard(o) {
    const d = o.derived;
    const inp = o.input;
    const rows = [];
    const add = (k, v) => rows.push('<tr><td>' + k + '</td><td>' + v + '</td></tr>');
    add(T('Dalga boyu'), U.fmt(inp.lambda, 5) + ' nm');
    if (d.P !== null) add(T('Ortalama güç'), U.fmtPrefixed(d.P, 'W', 4));
    if (d.Q !== null) add(T('Darbe enerjisi'), U.fmtPrefixed(d.Q, 'J', 4));
    if (d.Ppeak !== null) add(T('Tepe güç'), U.fmtPrefixed(d.Ppeak, 'W', 4));
    if (d.duty !== null) add(T('Görev oranı'), U.fmtPct(d.duty));
    if (o.eye.info.N) add(T('T içindeki darbe sayısı'), U.fmt(o.eye.info.N, 4));
    add(T('Göz maruziyet süresi'), U.fmtTime(d.T) + (inp.mode !== 'sp' && Math.abs(d.T - d.Tdefault) > 1e-12 ? ' <span class="muted">' + T('(standart {0})', U.fmtTime(d.Tdefault)) + '</span>' : ''));
    const sec = LE.beam.sectionAt(inp.beam, inp.range || 0, inp.model);
    add(T('Çıkış çapı / ıraksama (1/e)'), U.fmt(inp.beam.dx * 1e3, 4) + ' mm · ' + U.fmt(inp.beam.phix * 1e3, 4) + ' mrad');
    if (inp.range > 0) add(T('{0}\'de çap (1/e)', U.fmtDist(inp.range)), U.fmt(sec.dx * 1e3, 4) + (sec.dy !== sec.dx ? ' × ' + U.fmt(sec.dy * 1e3, 4) : '') + ' mm');
    return '<div class="card"><h3>' + T('Lazer ve ışın değerleri') + '</h3><div class="body"><table class="t kv"><tbody>' + rows.join('') + '</tbody></table></div></div>';
  }

  function assumptions(o) {
    const a = [];
    if (o.limits === 'aord') a.push(T('Sınır değerler: yalnız 2006/25/AT Ek II maruziyet sınır değerleri (AB / Türkiye işyeri).'));
    else if (o.limits === 'icnirp') a.push(T('Sınır değerler: yalnız ICNIRP 2013 (IEC 60825-1:2014 Ek A ve ANSI Z136.1-2014 ile uyumlu); 302–315 nm ve 1200–1400 nm\'de standartlardan daha koruyucu olanı uygulanır.'));
    else a.push(T('Sınır değerler: ICNIRP 2013 (IEC 60825-1:2014 / ANSI Z136.1-2014) ve 2006/25/AT Ek II birlikte; her setin kuralları kendi açıklığıyla uygulanır, en kısıtlayıcı olan belirler.'));
    a.push(o.input.alpha > 1.5 ? T('Işın içi bakışta genişletilmiş kaynak: α = {0} mrad.', U.fmt(o.input.alpha, 3)) : T('Işın içi bakış: nokta kaynak (α ≤ {0} mrad) — en muhafazakâr durum.', U.fmt(1.5)));
    a.push(o.input.model === 'linear'
      ? T('Işın merkezine bakış; çap ve ıraksama 1/e ölçütüne çevrildi; büyüme modeli: doğrusal (IEC TR 60825-14).')
      : T('Işın merkezine bakış; çap ve ıraksama 1/e ölçütüne çevrildi; büyüme modeli: karesel toplam (ANSI).'));
    if (o.eye.oav.on) a.push(T('Dürbünle bakış: objektif {0} mm, büyütme {1}×, geçirgenlik {2}; optik, girişte M·(ölçüm açıklığı) çaplı bölgeyi göze taşır (retina için etkin giriş = objektif, IEC Koşul 1 ile tutarlı).', U.fmt(o.eye.oav.D * 1e3, 3), U.fmt(o.eye.oav.M, 3), U.fmtPct(o.eye.oav.tau)));
    a.push(o.input.mu > 0 ? T('Atmosferik zayıflama: μ = {0} 1/km.', U.fmt(o.input.mu * 1e3, 3)) : T('Atmosferik zayıflama yok sayıldı (muhafazakâr).'));
    a.push(o.eye.scint ? T('Atmosferik türbülans (sintilasyon) payı: ışınım ×{0} (+{1} OD), ayrı NOHD ve gözlük önerisi olarak verildi; standart değerler payısızdır.', o.eye.scint.factor, o.eye.scint.odPlus) : T('Atmosferik türbülans (sintilasyon) payı uygulanmadı.'));
    if (o.input.mode === 'rp') a.push(T('Tekrarlı darbe: Kural 1, Kural 2 (tüm alt gruplar) ve retina için Kural 3 birlikte uygulanır; en kısıtlayıcı olan belirler.'));
    if (o.eyewear) a.push(T('EN 207: yoğunluklar gözlükteki ışının 1/e kesit alanıyla; tekrarlı darbede 400–1400 nm için N^¼ düzeltmesi (N = f × {0} s).', o.eyewear.window));
    a.push(T('Bu değerlendirme tek dalga boyu içindir. Taramalı ışınlar, çoklu dalga boyları ve sınıflandırma (AEL) kapsam dışıdır.'));
    return a;
  }

  function messagesCard(o, ctx) {
    // Uyarılar her zaman görünür; notlar ve varsayımlar dokununca açılır.
    const warns = [];
    for (const e of (ctx.formWarnings || [])) warns.push('<li class="warn">' + esc(e) + '</li>');
    for (const w of o.warnings) warns.push('<li class="warn">' + esc(X(w)) + '</li>');
    const info = [];
    for (const n of o.notes) info.push('<li class="note">' + esc(X(n)) + '</li>');
    for (const a of assumptions(o)) info.push('<li class="asm">' + esc(a) + '</li>');
    return '<div class="card"><h3>' + T('Uyarılar, notlar ve varsayımlar') + '</h3><div class="body">' +
      (warns.length ? '<ul class="msgs">' + warns.join('') + '</ul>' : '') +
      more('<ul class="msgs">' + info.join('') + '</ul>', T('Notlar ve varsayımlar ({0})', info.length)) +
      '<p class="note">' + T('Bu yazılım yetkin bir lazer güvenlik sorumlusunun değerlendirmesinin yerine geçmez; sonuçlar girilen parametreler kadar doğrudur.') + '</p></div></div>';
  }

  LE.render = { render, verdict, derivedCard, chart, chartReadout, chartRange, attachChart, assumptions, mech, rule, RULE, esc, limitText, ansi, distOrNone, setName, more };
})(typeof globalThis !== 'undefined' ? globalThis : this);
