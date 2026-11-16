/*
 * Lazer Emniyet — yardım metni
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  function html(st) {
    if (LE.i18n && LE.i18n.lang() === 'en') return htmlEn(st);
    return `
<p><b>Lazer Emniyet Analizi</b>, bir lazerin göz ve deri için tehlikesini hesaplar: maksimum izin verilen maruziyet (MPE),
göz tehlike mesafesi (NOHD), gerekli optik yoğunluk (OD), EN 207 / EN 208 göz koruyucu seviyeleri, yaygın yansıma,
mercek ve fiber çıkışı tehlikeleri. İnternet bağlantısı gerektirmez; veriler yalnız bu bilgisayarda saklanır.</p>

<h3>Hızlı kullanım</h3>
<ol>
  <li><b>Lazer parametreleri</b>: dalga boyu, çalışma modu ve güç/enerji. Sayılarda ondalık ayırıcı olarak virgül veya nokta,
  bilimsel gösterim için <span class="mono">1e-9</span> ya da <span class="mono">2×10^-4</span> kullanabilirsiniz. Her alanın altındaki gri satır,
  girdinin nasıl yorumlandığını gösterir — lütfen kontrol edin.</li>
  <li><b>Işın</b>: çap ve ıraksamayı üretici verisindeki ölçütle (çoğunlukla 1/e²) girin; program 1/e'ye çevirir.</li>
  <li>Sonuçlar anında güncellenir. Sol üstteki <b>☰</b> menüsünde <b>Yeni analiz</b>, <b>Örnekler</b>, <b>Envantere kaydet</b> (Ctrl+S),
  <b>Envanter</b>, yazdırılabilir <b>Rapor</b> (PDF) ve <b>Amsler Grid testi</b> bulunur. Sağ üstteki <b>⋮</b> menüsünde Yardım, Ayarlar ve Hakkında vardır.</li>
  <li>Ekran sade kalsın diye açıklamalar gizlidir: alanın yanındaki <span class="mono">i</span> düğmesine ya da sonuçların altındaki <b>Açıklama</b>
  satırına dokunun (⋮ → Ayarlar → Açıklamalar → Her zaman ile hepsi görünür).</li>
</ol>

<h3>Mesafe–OD grafiğini okuma</h3>
<ul>
  <li>Mesafe ekseni <b>logaritmiktir</b>: koyu çizgiler 10 katlar (10 cm, 1 m, 10 m …), soluk çizgiler ara değerler.
  OD de logaritmiktir (OD 3 = 1000 kat zayıflatma); bu yüzden uzak alanda eğriler düz iner (her 10 kat mesafede ≈ 2 OD).</li>
  <li>Sıfırın üstü gereken OD'dir; altındaki <b>yeşil bant</b> maruziyetin MPE'nin altında kaldığı bölgedir. Bir eğrinin sıfır
  çizgisini kestiği yer o eğrinin tehlike mesafesidir (kesik dikey çizgilerle işaretli NOHD, ENOHD, türbülans NOHD).</li>
  <li><b>Değer okuma</b>: fareyle grafiğin üzerine gelin ya da parmağınızla dokunup sürükleyin; seçilen mesafede her eğrinin
  değeri gösterilir (MPE aşılıyorsa gereken OD, aşılmıyorsa maruziyetin MPE'ye oranı). Klavyeyle: grafiğe Sekme (Tab) ile
  gelin, ←/→ ile ilerleyin (Shift ile 10 adım), Home/End uçlara gider, Esc kapatır. Değerler çizimden okunmaz, hesap
  motorundan o mesafe için yeniden hesaplanır.</li>
</ul>

<h3>Sınır değer setleri</h3>
<ul>
  <li><b>En koruyucu (önerilen, varsayılan)</b>: ICNIRP 2013 ve 2006/25/AT birlikte uygulanır. Her setin kuralları kendi ölçüm
  açıklığı, darbe gruplama süresi ve Kural 3 tanımıyla ayrı ayrı değerlendirilir; en kısıtlayıcı sonuç belirler. Sonuç tablolarında
  belirleyici sınırın hangi setten geldiği gösterilir.</li>
  <li><b>ICNIRP 2013 / IEC 60825-1:2014 Ek A</b>: güncel bilimsel sınırlar (ANSI Z136.1-2014 ile uyumlu).</li>
  <li><b>2006/25/AT Ek II</b>: AB yapay optik radyasyon direktifinin işçiler için maruziyet sınır değerleri; Türkiye'de
  ÇSGB'nin yapay optik radyasyon rehberi bu tablolara atıf yapar. ICNIRP 2000 kuşağına dayanır: retina kısa darbe sınırı
  5·10⁻³ C_E J/m² (ICNIRP 2013: 2·10⁻³), 1200–1400 nm'de C_C = 8, α_max = 100 mrad sabit, Kural 3'te tüm termal sınırlara
  C_P = N^−0,25 (N: maruziyet süresindeki darbe sayısı; T_min içindeki darbeler tek darbe sayılır).</li>
</ul>

<h3>Standart maruziyet süreleri</h3>
<ul>
  <li>Görünür (400–700 nm): <b>0,25 s</b> — kazara bakış, göz kırpma/kaçınma tepkisi.</li>
  <li>Görünmez IR (≥ 700 nm): <b>10 s</b> — kazara bakış; göz hareketleri daha uzun süreyi sınırlar.</li>
  <li>UV (&lt; 400 nm): <b>30 000 s</b> — tam vardiya (birikimli fotokimyasal etki).</li>
  <li>Yaygın yansıma: <b>600 s</b> (ayar/hizalama sırasında bakış). Kasıtlı bakış için süreyi artırın.</li>
</ul>

<h3>Terimler</h3>
<dl>
  <dt>MPE / MSD</dt><dd>Maksimum izin verilen maruziyet (ICNIRP, IEC, ANSI) / maruziyet sınır değeri (2006/25/AT). Aynı kavram; bu programda ikisi birlikte "MPE" olarak gösterilir.</dd>
  <dt>NOHD / ENOHD</dt><dd>Işın içi bakışta maruziyetin MPE'ye düştüğü mesafe; ENOHD dürbünle bakış içindir (varsayılan 7×50: objektif 50 mm,
  büyütme 7,1×, geçirgenlik görünürde %90, UV ve IR'de %70). 302,5–4000 nm'de uygulanır (IEC 60825-1:2014 Koşul 1); dışında cam optikler ışını geçirmez.
  Optik, girişte M × (ölçüm açıklığı) çaplı bölgeyi göze taşır: retina için 50 mm, kornea için (1 mm açıklık) ≈ 7 mm — IEC Koşul 1 ölçüm açıklıklarıyla aynı.</dd>
  <dt>NHZ</dt><dd>Yaygın (Lambert) yansımanın tehlikeli olduğu mesafe.</dd>
  <dt>OD</dt><dd>Gerekli optik yoğunluk, OD = log₁₀(maruziyet / MPE). "En kötü durum" tüm gücün ölçüm açıklığından geçtiğini varsayar.</dd>
  <dt>LB (EN 207)</dt><dd>Avrupa lazer koruyucu gözlük seviyesi. D: sürekli, I: 1 µs–0,25 s, R: 1 ns–1 µs, M: ≤ 1 ns darbe.
  Tekrarlı darbede hem darbe (I/R/M) hem ortalama güç (D) seviyesi sağlanmalıdır.</dd>
  <dt>RB (EN 208)</dt><dd>Görünür ışınla ayar (hizalama) gözlüğü; ışını göz kırpma tepkisinin koruduğu düzeye indirir.</dd>
  <dt>Kurallar 1–3</dt><dd>Tekrarlı darbede: (1) tek darbe sınırı, (2) her darbe grubunun T süresi sınırı (alt gruplar dahil),
  (3) retina termal sınırına C_P çarpanı. Tᵢ (5 µs / 13 µs) içindeki darbeler tek darbe sayılır.</dd>
</dl>

<h3>Atmosferik türbülans (sintilasyon) payı</h3>
<p>Açık havada uzun ışın yolunda sıcaklık farklarının oluşturduğu türbülans hücreleri zayıf, anlık mercekler gibi davranır;
ışın içinde sıcak noktalar oluşur ve yerel ışınım ortalamanın üstüne çıkabilir. Seçenek açıkken (varsayılan) ışınım ×10, yani
<b>+1 OD</b> pay kabul edilir ve ek sonuç olarak verilir: türbülans paylı NOHD, gözlem mesafesinde OD, önerilen en az OD (+1) ve EN 207
seviyeleri (+1). Standart (paysız) sonuçlar değişmez.</p>
<ul>
  <li>Ölçüm açıklığına giren enerji ışının toplam enerjisini aşamaz; bu nedenle mesafeye bağlı değerler "tüm güç göz bebeğinde" üst sınırıyla kırpılır.</li>
  <li>Kaynaklar farklıdır: ICNIRP 2013 sintilasyon sıcak noktalarının 3,5 mm ve üstü ortalama açıklıklarında nadiren önemli artış yarattığını,
  ANSI Z136.6-2015 Ek C tehlike değerlendirmesinin değişmediğini belirtir; İngiltere askerî yönergesi JSP 390 ise tehlike mesafesini en çok
  2,66 katına çıkarır (uzak alanda ≈ ×7 ışınım, ≈ +0,85 OD). +1 OD bu değerin yukarı yuvarlanmış, muhafazakâr hâlidir.</li>
  <li>Kapalı ortamdaki kısa ışın yollarında bu pay gerekmez; seçeneği kapatabilirsiniz.</li>
</ul>

<h3>Muhafazakâr seçimler</h3>
<ul>
  <li>Standartlar arasında fark olan yerlerde daha koruyucu değer: 302–315 nm (IEC/ANSI sürekli C₂ ile ICNIRP basamaklarının küçüğü),
  1200–1400 nm (ANSI 2014 kornea/lens sınırı ek ikili sınır olarak).</li>
  <li>1 mm'den küçük ışınlarda UV/IR göz (t &lt; 0,35 s) ve deri için açıklık ortalaması yerine tepe değer (ICNIRP dipnotları).</li>
  <li>Varsayılanlar: nokta kaynak, atmosferik zayıflama yok, Gauss/karesel ışın büyümesi, EN 207 için 10 s darbe sayımı penceresi.</li>
</ul>

<h3>Doğrulama</h3>
<ul>
  <li>Açılış öz-denetimi: <b>${st.passed}/${st.total}</b> test vektörü (ICNIRP tablolarından elle hesaplanmış değerler ve yayımlanmış örnekler).</li>
  <li>Geliştirme testleri (<span class="mono">node --test</span>): Kentek EasyHaz LSO 2014 (ANSI Z136.1-2014) çalışma kitabıyla 400 rastgele vaka ×
  4 mesafe ve 2176 noktalık MPE taramasında karşılaştırıldı — hiçbir çıktıda daha az koruyucu sonuç vermez; farklar OKUBENI.md'de belgelenmiştir.</li>
  <li>2006/25/AT seti, EasyHaz'ın 2010 tarihli 12 örnek dosyasındaki (ANSI Z136.1-2007 ≈ ICNIRP 2000) MPE, OD, NOHD, mercek, fiber ve
  yaygın yansıma sonuçlarıyla birebir karşılaştırıldı.</li>
</ul>

<h3>Amsler Grid testi</h3>
<ul>
  <li>Lazer maruziyeti şüphesinde merkezi görmeyi her göz için ayrı ayrı yoklayan hızlı saha testidir (☰ → Amsler Grid testi).
  Kareler gerçek 5 mm çizilir; telefon ≈ 30 cm uzakta tutulunca her kare ≈ 1°'dir (Amsler 1953: 10 × 10 cm, 20 × 20 kare).</li>
  <li>Ekran ölçüsü Android'in bildirdiği piksel yoğunluğundan alınır; bir banka ya da kimlik kartıyla (85,60 × 53,98 mm) doğrulanabilir.
  Tarayıcıda kart ayarı yapılmadan kareler 5 mm olmayabilir.</li>
  <li>Bozuk, eksik ya da karanlık görülen karelere dokunularak işaretlenir. İşaret ya da belirti varsa sonuç "bulgu var"dır: aynı gün göz hekimine
  başvurulmalı ve olay lazer güvenlik sorumlusuna bildirilmelidir.</li>
  <li>Normal sonuç hasarı dışlamaz (duyarlılık sınırlı; Crossland ve Rubin 2007). Sonuçlar bu cihazda saklanır, aynı kişinin önceki testiyle karşılaştırılır
  ve PDF olarak yazdırılabilir. Gerçek boyutlu kâğıt ızgara da yazdırılabilir.</li>
</ul>

<h3>Kapsam dışı</h3>
<ul>
  <li>Lazer sınıflandırması (AEL hesabı), çoklu dalga boyu toplama, taramalı ışınlar, darbe grupları (burst), aynasal yansıma geometrisi.</li>
  <li>Sonuçlar girilen verilere dayanır. Bu yazılım yetkin bir lazer güvenlik sorumlusunun değerlendirmesinin yerine geçmez.</li>
</ul>
<p class="muted">Uygulama ${LE.APP_VERSION || ''} · hesap motoru ${LE.analysis.ENGINE_VERSION}.</p>`;
  }

  function htmlEn(st) {
    return `
<p><b>Laser Safety Analysis</b> calculates the hazard of a laser to the eye and skin: maximum permissible exposure (MPE),
nominal ocular hazard distance (NOHD), required optical density (OD), EN 207 / EN 208 eyewear levels, diffuse reflection,
lens and fibre output hazards. It needs no internet connection; data are stored only on this device.</p>

<h3>Quick start</h3>
<ol>
  <li><b>Laser parameters</b>: wavelength, operating mode and power/energy. Use a comma or a dot as the decimal mark and
  <span class="mono">1e-9</span> or <span class="mono">2×10^-4</span> for scientific notation. The grey line under each field shows
  how the input was interpreted — please check it.</li>
  <li><b>Beam</b>: enter the diameter and divergence in the definition used by the manufacturer (usually 1/e²); the program converts to 1/e.</li>
  <li>Results update immediately. The <b>☰</b> menu at the top left holds <b>New analysis</b>, <b>Examples</b>, <b>Save to inventory</b> (Ctrl+S),
  <b>Inventory</b>, the printable <b>Report</b> (PDF) and the <b>Amsler grid test</b>. The <b>⋮</b> menu at the top right holds Help, Settings and About.</li>
  <li>Explanations are hidden to keep the screen calm: tap <span class="mono">i</span> next to a field or <b>Explanation</b> under a result to show them
  (⋮ → Settings → Explanations → Always to show all).</li>
</ol>

<h3>Reading the distance–OD chart</h3>
<ul>
  <li>The distance axis is <b>logarithmic</b>: dark lines are decades (10 cm, 1 m, 10 m …), faint lines intermediate values.
  OD is logarithmic too (OD 3 = attenuation by 1000); therefore the curves fall as straight lines in the far field (≈ 2 OD per decade of distance).</li>
  <li>Above zero is the required OD; the <b>green band</b> below is where the exposure stays below the MPE. Where a curve crosses the zero
  line is its hazard distance (NOHD, ENOHD and scintillation NOHD are marked with dashed vertical lines).</li>
  <li><b>Reading values</b>: hover with the mouse or touch and drag; the value of every curve at the chosen distance is shown (the required OD if the MPE
  is exceeded, otherwise the exposure-to-MPE ratio). Keyboard: Tab to the chart, ←/→ to move (Shift for 10 steps), Home/End for the ends, Esc to close.
  Values are not read from the drawing; they are recalculated by the engine for that distance.</li>
</ul>

<h3>Limit sets</h3>
<ul>
  <li><b>Most protective (recommended, default)</b>: ICNIRP 2013 and 2006/25/EC applied together. Each set is evaluated with its own
  limiting aperture, pulse grouping time and Rule 3; the most restrictive result governs. The result tables show which set governs.</li>
  <li><b>ICNIRP 2013 / IEC 60825-1:2014 Annex A</b>: current scientific limits (consistent with ANSI Z136.1-2014).</li>
  <li><b>2006/25/EC Annex II</b>: occupational exposure limit values of the EU artificial optical radiation directive (also used in Turkey).
  Based on the ICNIRP 2000 generation: short-pulse retinal limit 5·10⁻³ C_E J/m² (ICNIRP 2013: 2·10⁻³), C_C = 8 at 1200–1400 nm,
  α_max = 100 mrad fixed, Rule 3 with C_P = N^−0.25 for all thermal limits (N: pulses in the exposure duration; pulses within T_min count as one).</li>
</ul>

<h3>Standard exposure durations</h3>
<ul>
  <li>Visible (400–700 nm): <b>0.25 s</b> — accidental viewing, blink/aversion response.</li>
  <li>Invisible IR (≥ 700 nm): <b>10 s</b> — accidental viewing; eye movements limit longer exposure.</li>
  <li>UV (&lt; 400 nm): <b>30 000 s</b> — full working day (cumulative photochemical effect).</li>
  <li>Diffuse reflection: <b>600 s</b> (viewing during alignment). Increase the duration for intentional viewing.</li>
</ul>

<h3>Terms</h3>
<dl>
  <dt>MPE / ELV</dt><dd>Maximum permissible exposure (ICNIRP, IEC, ANSI) / exposure limit value (2006/25/EC). Same concept; both are shown as "MPE" here.</dd>
  <dt>NOHD / ENOHD</dt><dd>Distance at which intrabeam exposure falls to the MPE; ENOHD is for viewing with binoculars (default 7×50: 50 mm objective,
  magnification 7.1×, transmittance 90% in the visible, 70% in UV and IR). Applied at 302.5–4000 nm (IEC 60825-1:2014 Condition 1); outside this range glass optics do not transmit.
  The optics carry a region of diameter M × (limiting aperture) at the entrance to the eye: 50 mm for the retina, ≈ 7 mm for the cornea (1 mm aperture) — the same as the IEC Condition 1 apertures.</dd>
  <dt>NHZ</dt><dd>Distance within which a diffuse (Lambertian) reflection is hazardous.</dd>
  <dt>OD</dt><dd>Required optical density, OD = log₁₀(exposure / MPE). "Worst case" assumes that the whole power passes the limiting aperture.</dd>
  <dt>LB (EN 207)</dt><dd>European laser protective eyewear level. D: continuous wave, I: 1 µs–0.25 s, R: 1 ns–1 µs, M: ≤ 1 ns pulses.
  For repetitive pulses both the pulse (I/R/M) and the average power (D) levels must be met.</dd>
  <dt>RB (EN 208)</dt><dd>Alignment eyewear for visible beams; reduces the beam to the level protected by the blink reflex.</dd>
  <dt>Rules 1–3</dt><dd>For repetitive pulses: (1) single-pulse limit, (2) limit for every pulse group over time T (including sub-groups),
  (3) correction factor C_P for the retinal thermal limit. Pulses within Tᵢ (5 µs / 13 µs) count as a single pulse.</dd>
</dl>

<h3>Atmospheric turbulence (scintillation) margin</h3>
<p>Over long outdoor beam paths, turbulence cells caused by temperature differences act as weak, momentary lenses;
hot spots form in the beam and the local irradiance can exceed the average. When the option is on (default) a margin of irradiance ×10, i.e.
<b>+1 OD</b>, is applied and given as an additional result: NOHD with margin, OD at the observation distance, minimum recommended OD (+1) and EN 207
levels (+1). The standard results without margin are unchanged.</p>
<ul>
  <li>The energy entering the limiting aperture cannot exceed the total beam energy; distance-dependent values are therefore capped at "all power in the pupil".</li>
  <li>Sources differ: ICNIRP 2013 notes that scintillation hot spots rarely give a significant increase for averaging apertures of 3.5 mm and above,
  ANSI Z136.6-2015 Annex C says the hazard evaluation is unchanged; the UK military guideline JSP 390 increases the hazard distance by up to
  2.66× (≈ ×7 irradiance in the far field, ≈ +0.85 OD). +1 OD is a rounded-up, conservative form of this value.</li>
  <li>The margin is not needed for short indoor beam paths; you can switch the option off.</li>
</ul>

<h3>Conservative choices</h3>
<ul>
  <li>Where the standards differ, the more protective value: 302–315 nm (smaller of the continuous IEC/ANSI C₂ and the ICNIRP steps),
  1200–1400 nm (ANSI 2014 cornea/lens limit as an additional dual limit).</li>
  <li>For beams smaller than 1 mm, the peak value instead of the aperture average for the UV/IR eye (t &lt; 0.35 s) and the skin (ICNIRP footnotes).</li>
  <li>Defaults: point source, no atmospheric attenuation, Gaussian/quadrature beam growth, 10 s pulse-counting window for EN 207.</li>
</ul>

<h3>Validation</h3>
<ul>
  <li>Start-up self-test: <b>${st.passed}/${st.total}</b> test vectors (values calculated by hand from the ICNIRP tables and published examples).</li>
  <li>Development tests (<span class="mono">node --test</span>): compared with the Kentek EasyHaz LSO 2014 (ANSI Z136.1-2014) workbook in 400 random cases ×
  4 distances and a 2176-point MPE scan — never less protective for any output; differences are documented in OKUBENI.md.</li>
  <li>The 2006/25/EC set was compared one-to-one with the MPE, OD, NOHD, lens, fibre and diffuse reflection results of the 12 EasyHaz example files
  from 2010 (ANSI Z136.1-2007 ≈ ICNIRP 2000).</li>
</ul>

<h3>Amsler grid test</h3>
<ul>
  <li>A quick field test of the central vision of each eye after a suspected laser exposure (☰ → Amsler grid test).
  The squares are drawn 5 mm wide; with the phone held ≈ 30 cm away each square subtends ≈ 1° (Amsler 1953: 10 × 10 cm, 20 × 20 squares).</li>
  <li>The screen size comes from the pixel density reported by Android and can be checked with a bank or ID card (85.60 × 53.98 mm).
  In a browser the squares may not be 5 mm until the card calibration is done.</li>
  <li>Squares seen as distorted, missing or dark are marked by tapping. Any mark or symptom makes the result abnormal: an eye doctor must be seen
  the same day and the incident reported to the laser safety officer.</li>
  <li>A normal result does not rule out injury (limited sensitivity; Crossland and Rubin 2007). Results are stored on this device, compared with the same
  person's previous test and can be printed as PDF. An actual-size paper grid can be printed as well.</li>
</ul>

<h3>Out of scope</h3>
<ul>
  <li>Laser classification (AEL), multi-wavelength summation, scanning beams, pulse bursts, specular reflection geometry.</li>
  <li>Results depend on the data entered. This software does not replace the assessment of a competent laser safety officer.</li>
</ul>
<p class="muted">Application ${LE.APP_VERSION || ''} · calculation engine ${LE.analysis.ENGINE_VERSION}.</p>`;
  }

  LE.help = { html };
})(typeof globalThis !== 'undefined' ? globalThis : this);
