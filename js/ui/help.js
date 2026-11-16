/*
 * Lazer Emniyet — yardım metni
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  function html(st) {
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
  <li>Sonuçlar anında güncellenir. <b>Kaydet</b> ile envantere ekleyin, <b>Rapor</b> ile yazdırılabilir rapor (PDF) alın.</li>
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

<h3>Kapsam dışı</h3>
<ul>
  <li>Lazer sınıflandırması (AEL hesabı), çoklu dalga boyu toplama, taramalı ışınlar, darbe grupları (burst), aynasal yansıma geometrisi.</li>
  <li>Sonuçlar girilen verilere dayanır. Bu yazılım yetkin bir lazer güvenlik sorumlusunun değerlendirmesinin yerine geçmez.</li>
</ul>
<p class="muted">Hesap motoru sürümü ${LE.analysis.ENGINE_VERSION}.</p>`;
  }

  LE.help = { html };
})(typeof globalThis !== 'undefined' ? globalThis : this);
