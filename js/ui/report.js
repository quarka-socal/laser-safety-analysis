/*
 * Lazer Emniyet — yazdırılabilir lazer tehlike analizi raporu
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});
  const U = LE.units;

  const COLORS = { '--danger': '#b71c1c', '--accent': '#1c4fd8', '--warn': '#9a5800', '--line': '#cfd5df', '--muted': '#555', '--ink': '#000', '--panel': '#fff', '--ok': '#1b7a33', '--ok-bg': '#e7f5eb', '--scint': '#7b1fa2' };

  function staticColors(svg) {
    return svg.replace(/var\((--[a-z-]+)\)/g, (m, k) => COLORS[k] || '#000');
  }

  const MODE = { cw: 'Sürekli dalga (CW)', sp: 'Tek darbe', rp: 'Tekrarlı darbe' };

  function row(k, v) {
    return '<tr><th style="width:38%">' + k + '</th><td>' + v + '</td></tr>';
  }

  function controls(o, v) {
    const c = [];
    const cls = v.cls || '';
    const hi = cls === '3B' || cls === '4' || o.eye.nohd > 0;
    const d = LE.render.distOrNone;
    c.push('Lazer yalnız eğitim almış ve yetkilendirilmiş personel tarafından kullanılmalıdır; kullanım talimatı (SOP) hazırlanmalıdır.');
    if (hi) {
      c.push('Lazer kontrollü alan tanımlanmalı ve NOHD (' + d(o.eye.nohd, o.eye.nohdInf) + ') içindeki tüm erişilebilir ışın yolu bu alanda kalmalı ya da ışın muhafaza/perdelerle sınırlandırılmalıdır.');
      c.push('Girişlerde lazer uyarı işareti (ISO 7010 W004) ve sınıf bilgisi bulunmalı; Sınıf 3B/4 için "lazer çalışıyor" uyarı ışığı ve kapı kilidi (interlock) önerilir.');
      c.push('Sınıf 3B ve 4 lazerler için anahtarlı kumanda, acil durdurma ve bir Lazer Güvenlik Sorumlusu (LGS) atanması gereklidir (IEC TR 60825-14).');
    }
    if (o.eyewear && o.eye.odWorst > 0) {
      c.push('Göz koruyucu: EN 207 işaretlemesi en az <b class="mono">' + LE.render.esc(o.eyewear.marking) + '</b> olan gözlük; ANSI karşılığı en az OD ' + LE.eyewear.recommendedOD(o.eye.odWorst) + '. Gözlükler kullanımdan önce hasar ve renk değişimi yönünden kontrol edilmelidir.');
      if (o.eye.scint) c.push('Açık havada uzun ışın yolunda atmosferik türbülans (sintilasyon) payı olarak +' + o.eye.scint.odPlus + ' OD önerilir: en az <b>OD ' + o.eye.scint.recOD + '</b>' + (o.eyewear.markingScint ? ' (EN 207 <b class="mono">' + LE.render.esc(o.eyewear.markingScint) + '</b>)' : '') + '; bu durumda tehlike mesafesi ' + d(o.eye.scint.nohd, o.eye.scint.nohdInf) + ' alınmalıdır.');
      if (o.eyewear.en208 && o.eyewear.en208.applicable) c.push('Görünür ışın ayarı (hizalama) için EN 208 RB' + o.eyewear.en208.rb + ' ayar gözlüğü kullanılabilir; ayar mümkün olan en düşük güçte yapılmalıdır.');
    }
    if (o.diffuse && o.diffuse.eye.nhz > 0) c.push('Yaygın yansımalar ' + d(o.diffuse.eye.nhz, o.diffuse.eye.inf) + ' mesafeye kadar tehlikelidir: ışın durdurucular mat, soğurucu ve yanmaz malzemeden olmalı; çalışma alanında aynasal (parlak) yüzeyler bulunmamalıdır.');
    if (o.skin.timesMPE > 1) c.push('Deri tehlikesi (' + U.fmt(o.skin.timesMPE, 3) + ' × MPE): ışın yoluna el/vücut girmesini engelleyen muhafazalar kullanılmalı; gerektiğinde koruyucu eldiven/giysi seçilmelidir.');
    if (cls === '4' || o.skin.timesMPE > 1e3) c.push('Sınıf 4: yangın ve lazerle oluşan hava kirleticileri (LGAC) için yanmaz ışın durdurucu, duman emme/havalandırma ve yangın söndürücü bulundurulmalıdır.');
    c.push('Işın yolu oturan/ayakta duran kişilerin göz seviyesinden uzak tutulmalı; saat, yüzük gibi yansıtıcı takılar çıkarılmalıdır.');
    c.push('İş sağlığı ve güvenliği mevzuatı kapsamında yapay optik radyasyon risk değerlendirmesi (AB 2006/25/AT direktifi esaslı ulusal düzenleme) yapılmalı ve kayıt altına alınmalıdır.');
    return c;
  }

  function build(o, state, meta) {
    const v = state.v;
    const esc = LE.render.esc;
    const inp = o.input;
    const id = meta.reportId;
    const now = new Date();
    const st = meta.selftest;
    const parts = [];
    parts.push('<div class="head"><div><h1>Lazer Tehlike Analizi Raporu</h1><div>' + esc(v.name || 'Adsız lazer') + '</div></div>' +
      '<div style="text-align:right">Rapor no: <b>' + esc(id) + '</b><br>Analiz tarihi: ' + esc(v.date || '') + '<br>Oluşturma: ' + now.toLocaleString('tr-TR') + '</div></div>');

    // Karar kutusu
    const e = o.eye;
    let vtxt;
    if (e.odWorst > 0) vtxt = 'Doğrudan ışın göz için tehlikeli. NOHD = ' + LE.render.distOrNone(e.nohd, e.nohdInf) + (e.enohd !== null ? ', dürbünle ENOHD = ' + LE.render.distOrNone(e.enohd, e.enohdInf) : '') + '. Gerekli koruma: ' + (o.eyewear ? o.eyewear.marking : '') + ' (OD ≥ ' + LE.eyewear.recommendedOD(e.odWorst) + ').';
    else vtxt = 'Doğrudan ışın, seçilen maruziyet süresi (' + U.fmtTime(o.derived.T) + ') için MPE\'nin altındadır.';
    parts.push('<div class="verdictbox">' + esc(vtxt) + '</div>');

    parts.push('<h2>1. Lazer kimliği</h2><table><tbody>' +
      row('Tanım', esc(v.name)) + row('Üretici / model', esc([v.maker, v.modelNo].filter(Boolean).join(' / '))) +
      row('Seri no / envanter no', esc([v.serial, v.inv].filter(Boolean).join(' / '))) + row('Lazer sınıfı (etiket)', esc(v.cls ? 'Sınıf ' + v.cls : 'Belirtilmedi')) +
      row('Konum', esc(v.loc)) + row('Sorumlu / LGS', esc([v.owner, v.lso].filter(Boolean).join(' / '))) + row('Uygulama · durum', esc([v.app, v.status].filter(Boolean).join(' · '))) +
      '</tbody></table>');

    const d = o.derived;
    const prm = [];
    prm.push(row('Sınır değer seti', esc({ both: 'En koruyucu: ICNIRP 2013 + 2006/25/AT', icnirp: 'ICNIRP 2013 / IEC 60825-1:2014 Ek A', aord: '2006/25/AT Ek II (AB / Türkiye işyeri)' }[o.limits])));
    prm.push(row('Dalga boyu', U.fmt(inp.lambda, 5) + ' nm'));
    prm.push(row('Çalışma modu', MODE[inp.mode]));
    if (d.P !== null) prm.push(row('Ortalama güç', U.fmtPrefixed(d.P, 'W', 4)));
    if (d.Q !== null) prm.push(row('Darbe enerjisi', U.fmtPrefixed(d.Q, 'J', 4)));
    if (inp.mode !== 'cw') prm.push(row('Darbe süresi', U.fmtTime(inp.tau)));
    if (inp.mode === 'rp') prm.push(row('Tekrarlama frekansı', U.fmtPrefixed(inp.f, 'Hz', 4)));
    if (d.Ppeak !== null) prm.push(row('Tepe güç', U.fmtPrefixed(d.Ppeak, 'W', 4)));
    prm.push(row('Göz maruziyet süresi', U.fmtTime(d.T)));
    prm.push(row('Işın çapı / ıraksama (1/e)', U.fmt(inp.beam.dx * 1e3, 4) + (inp.beam.dy !== inp.beam.dx ? ' × ' + U.fmt(inp.beam.dy * 1e3, 4) : '') + ' mm · ' + U.fmt(inp.beam.phix * 1e3, 4) + (inp.beam.phiy !== inp.beam.phix ? ' × ' + U.fmt(inp.beam.phiy * 1e3, 4) : '') + ' mrad'));
    prm.push(row('Profil · girişte ölçüt', esc({ gauss: 'Gauss', 'tophat-ellipse': 'Düz tepe (elips)', 'tophat-rect': 'Düz tepe (dikdörtgen)' }[inp.beam.profile]) + ' · ' + esc(v.spec === '1/e2' ? '1/e² verildi' : '1/e verildi')));
    if (inp.oav && inp.oav.on) {
      const ov = o.eye.oav;
      prm.push(row('Optik destekli bakış', ov.on
        ? 'Evet: ' + U.fmt(ov.D * 1e3, 3) + ' mm objektif, ' + U.fmt(ov.M, 3) + '× büyütme, geçirgenlik ' + U.fmtPct(ov.tau)
        : 'İstendi; bu dalga boyunda uygulanmadı (cam optikler 302,5 nm altını ve 4 µm üstünü geçirmez)'));
    }
    if (inp.mu > 0) prm.push(row('Atmosferik zayıflama', U.fmt(inp.mu * 1e3, 3) + ' 1/km'));
    parts.push('<h2>2. Lazer ve ışın parametreleri</h2><table><tbody>' + prm.join('') + '</tbody></table>');

    // Özet
    const sum = [];
    const box = (k, val, s) => sum.push('<div>' + k + '<b>' + val + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</div>');
    box('Göz NOHD', LE.render.distOrNone(e.nohd, e.nohdInf), e.enohd !== null ? 'ENOHD ' + LE.render.distOrNone(e.enohd, e.enohdInf) : '');
    box('Gerekli OD (en kötü)', U.fmtOD(e.odWorst), 'öneri ≥ OD ' + LE.eyewear.recommendedOD(e.odWorst));
    box('OD @ ' + U.fmtDist(e.atRange.r) + (e.atRange.viaOptics ? ' (dürbünle)' : ''), U.fmtOD(e.odAtRange), '');
    if (e.scint) box('Türbülans payıyla (+' + e.scint.odPlus + ' OD)', 'OD ' + e.scint.recOD, 'NOHD ' + LE.render.distOrNone(e.scint.nohd, e.scint.nohdInf) + (o.eyewear && o.eyewear.markingScint ? ' · ' + esc(o.eyewear.markingScint) : ''));
    box('EN 207', o.eyewear ? esc(o.eyewear.marking) : '—', '');
    box('EN 208', o.eyewear && o.eyewear.en208 ? (o.eyewear.en208.applicable ? 'RB' + o.eyewear.en208.rb : 'uygun değil') : '—', '');
    const g = e.summary.governing;
    box('Göz MPE', U.fmt(g.perPulseH) + ' J/m²', esc(LE.render.RULE[g.rule]) + (inp.mode === 'rp' ? ' (darbe başına)' : '') + ' · ' + LE.render.setName(g.crit.set));
    if (o.diffuse) box('Yaygın yansıma NHZ', LE.render.distOrNone(o.diffuse.eye.nhz, o.diffuse.eye.inf), 'ρ = ' + U.fmtPct(o.diffuse.rho));
    box('Deri', U.fmt(o.skin.timesMPE, 3) + ' × MPE', 'NSHD ' + LE.render.distOrNone(o.skin.nshd, o.skin.nshdInf));
    if (o.lens) box('Mercek NHZ (odaktan)', LE.render.distOrNone(o.lens.nohd, o.lens.inf), '');
    if (o.fiber) box('Fiber NOHD', LE.render.distOrNone(o.fiber.nohd, o.fiber.inf), '');
    parts.push('<h2>3. Sonuç özeti</h2><div class="sumgrid">' + sum.join('') + '</div>');
    parts.push('<div style="margin-top:8px">' + staticColors(LE.render.chart(o)) + '</div>');

    // MPE kuralları
    const mrows = [];
    for (const sid of o.sets) {
      const ss = e.summaryBySet[sid];
      if (!ss) continue;
      for (const r of ['CW', 'TD', 'K1', 'K2', 'K2a', 'K3']) {
        const b = ss.byRule[r];
        if (!b) continue;
        const gov = e.summary.governing.crit === b.crit;
        mrows.push('<tr' + (gov ? ' style="font-weight:700"' : '') + '><td>' + LE.render.setName(sid) + '</td><td>' + LE.render.RULE[r] + '</td><td class="mono">' + U.fmt(b.perPulseH) + ' J/m²</td><td class="mono">' + U.fmtTime(b.crit.t) + '</td><td class="mono">' + U.fmt(b.crit.apertureM * 1e3, 3) + ' mm</td><td>' + esc(LE.render.mech(b.crit.mech)) + '</td><td>' + esc(b.crit.formula) + '</td></tr>');
      }
    }
    parts.push('<h2>4. MPE ayrıntıları</h2><table><thead><tr><th>Set</th><th>Kural</th><th>' + (inp.mode === 'rp' ? 'Darbe başına MPE' : 'MPE') + '</th><th>Zaman tabanı</th><th>Açıklık</th><th>Mekanizma</th><th>Formül</th></tr></thead><tbody>' + mrows.join('') + '</tbody></table>');
    // her setin kendi faktörleri (yalnız kullanılan setler)
    const fline = (name, f, ab) => {
      const fx = [];
      const has = (x) => x !== null && x !== undefined && !Number.isNaN(x);
      if (has(f.CA)) fx.push('C_A = ' + U.fmt(f.CA, 4));
      if (has(f.CB)) fx.push('C_B = ' + U.fmt(f.CB, 4));
      if (has(f.CC)) fx.push('C_C = ' + U.fmt(f.CC, 4));
      if (has(f.CE)) fx.push('C_E = ' + U.fmt(f.CE, 4));
      if (has(f.CP)) fx.push('C_P = ' + U.fmt(f.CP, 4));
      if (has(f.T2)) fx.push('T₂ = ' + U.fmtTime(f.T2));
      if (ab ? has(f.Tmin) : has(f.Ti)) fx.push((ab ? 'T_min = ' : 'Tᵢ = ') + U.fmtTime(ab ? f.Tmin : f.Ti));
      fx.push('göz açıklığı ' + U.fmt(f.apertureEye * 1e3, 3) + ' mm');
      return name + ': ' + fx.join(' · ');
    };
    const fl = [];
    if (o.sets.indexOf('ICNIRP') >= 0) fl.push(fline('ICNIRP 2013', o.factors, false));
    if (o.sets.indexOf('AB') >= 0 && o.factors.AB) fl.push(fline('2006/25/AT', o.factors.AB, true));
    parts.push('<p class="mono" style="font-size:9pt">' + fl.join('<br>') + '</p>');

    if (o.eyewear) {
      const er = o.eyewear.en207.map((i) => '<tr><td>' + i.mode + '</td><td class="mono">' + U.fmt(i.density) + ' ' + i.unit + '</td><td>' + esc(i.basis) + '</td><td><b>LB' + i.lb + '</b></td></tr>').join('');
      parts.push('<h2>5. Göz koruyucu (EN 207 / EN 208)</h2><table><thead><tr><th>Mod</th><th>Yoğunluk</th><th>Esas</th><th>Seviye</th></tr></thead><tbody>' + er + '</tbody></table>' +
        '<p>Gözlükteki ışın çapı: ' + U.fmt(o.eyewear.sec.dx * 1e3, 3) + ' mm (1/e). ' + (o.eyewear.en208 ? 'EN 208: ' + esc(o.eyewear.en208.applicable ? 'RB' + o.eyewear.en208.rb : 'uygun değil') + '.' : '') + '</p>');
    }

    parts.push('<h2>6. Önerilen kontrol önlemleri</h2><ol>' + controls(o, v).map((c) => '<li>' + c + '</li>').join('') + '</ol>');

    const msgs = o.warnings.map((w) => '<li><b>Uyarı:</b> ' + esc(w) + '</li>')
      .concat(o.notes.map((n) => '<li>' + esc(n) + '</li>'))
      .concat(LE.render.assumptions(o).map((a) => '<li>' + esc(a) + '</li>'));
    parts.push('<h2>7. Uyarılar, notlar ve varsayımlar</h2><ul>' + msgs.join('') + '</ul>');
    if (v.notes) parts.push('<h2>8. Değerlendirici notları</h2><p style="white-space:pre-wrap">' + esc(v.notes) + '</p>');

    parts.push('<div class="sign"><div>Hazırlayan (Lazer Güvenlik Sorumlusu)<br>' + esc(v.lso || '') + '</div><div>Onaylayan / tarih</div></div>');
    parts.push('<p class="disc">Hesap yöntemi: ' + (o.limits === 'aord' ? '2006/25/AT Ek II maruziyet sınır değerleri' : o.limits === 'icnirp' ? 'ICNIRP 2013 maruziyet sınırları (IEC 60825-1:2014 Ek A, ANSI Z136.1-2014 uyumlu)' : 'ICNIRP 2013 (IEC 60825-1:2014 Ek A, ANSI Z136.1-2014 uyumlu) ve 2006/25/AT Ek II sınır değerlerinin en koruyucusu') + ', EN 207:2017 ve EN 208 koruma seviyeleri. ' +
      'Yazılım: Lazer Emniyet Analizi, hesap motoru v' + esc(LE.analysis.ENGINE_VERSION) + '; açılış öz-denetimi ' + st.passed + '/' + st.total + (st.passed === st.total ? ' başarılı' : ' — BAŞARISIZ') + '. ' +
      'Bu rapor girilen parametrelere dayanır ve yetkin bir lazer güvenlik sorumlusunun değerlendirmesinin yerine geçmez.</p>');
    return parts.join('');
  }

  function reportId(state) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return (state.reportId) || ('LEA-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()));
  }

  function standaloneHTML(body, title) {
    const css = Array.from(document.styleSheets).map((s) => { try { return Array.from(s.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    return '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + LE.render.esc(title) + '</title><style>' + css +
      '\nbody{background:#fff;padding:18px} #report-print{display:block}</style></head><body><div id="report-print" class="report" style="max-width:900px;margin:0 auto">' + body + '</div></body></html>';
  }

  LE.report = { build, reportId, standaloneHTML, controls };
})(typeof globalThis !== 'undefined' ? globalThis : this);
