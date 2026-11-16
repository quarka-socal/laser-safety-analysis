# Lazer Emniyet Analizi

Lazer tehlike analizi yazılımı: **MPE**, **NOHD / ENOHD**, gerekli **optik yoğunluk (OD)**,
**EN 207 / EN 208** göz koruyucu seviyeleri, **yaygın yansıma**, **deri**, **mercek (lens-on-laser)**
ve **fiber optik** tehlikeleri; envanter ve yazdırılabilir rapor. Türkçe arayüz, internet gerektirmez,
kurulum gerektirmez.

Sınır değerler iki set hâlinde uygulanır ve varsayılan olarak **en koruyucusu** belirler:

- **ICNIRP 2013** (Health Phys. 105(3):271–295) — **IEC 60825-1:2014 Ek A** ve **ANSI Z136.1-2014** ile uyumlu
- **2006/25/AT Ek II** — AB yapay optik radyasyon direktifinin işçiler için maruziyet sınır değerleri (MSD);
  Türkiye'de ÇSGB'nin yapay optik radyasyon rehberi bu tablolara atıf yapar

> Bu yazılım yetkin bir Lazer Güvenlik Sorumlusunun (LGS) değerlendirmesinin yerine geçmez.
> Sonuçlar girilen parametreler kadar doğrudur.

---

## Başlatma

| Yöntem | Nasıl |
|---|---|
| Doğrudan | `index.html` dosyasını Firefox/Chrome ile açın |
| Komut satırı | `./baslat.sh` |
| Tek dosya (taşınabilir) | `dist/LazerEmniyet.html` — tek başına kopyalanıp her bilgisayarda açılabilir |

Klasör istenen yere taşınabilir; tüm dosyalar göreli yollarla bağlıdır.

## Kullanım

1. **Lazer parametreleri** — sınır değer seti (varsayılan: en koruyucu), dalga boyu, mod (sürekli / tek darbe / tekrarlı darbe), güç veya enerji,
   darbe süresi, frekans. Maruziyet süresi varsayılan olarak standarttan gelir (görünür 0,25 s, IR 10 s,
   UV 30 000 s); düğmelerle değiştirilebilir.
2. **Işın** — çap ve ıraksamayı üretici verisindeki ölçütle girin (genelde 1/e²). Eliptik ve düz tepe
   profiller desteklenir. M² otomatik hesaplanır; kırınım sınırının altındaki değerler uyarı verir.
3. İsteğe bağlı bölümler: dürbünle bakış (ENOHD), atmosferik zayıflama, yaygın yansıma, mercek, fiber,
   deri maruziyet süresi, gözlükteki ışın çapı, lazer kimliği.
4. Sonuçlar her değişiklikte anında güncellenir. **Kaydet** (Ctrl+S) envantere ekler, **Rapor** yazdırılabilir
   rapor (PDF) üretir, **Örnekler** menüsünde 12 tipik lazer vardır.

Sayı girişi: ondalık için virgül veya nokta (`1,5` = `1.5`), bilimsel gösterim `1e-9`, `2x10^-4`.
Binlik ayırıcı kullanılmaz; `1.000` gibi belirsiz girişler uyarı verir. Her alanın altındaki satır
girdinin nasıl yorumlandığını gösterir (ör. `= 1064 nm`).

Envanter bu bilgisayarda tarayıcının yerel deposunda tutulur. Yedek için **Envanter → JSON dışa aktar**;
Excel için **CSV**.

## Hesaplanan büyüklükler

- **Göz MPE**: retina termal, retina fotokimyasal (400–600 nm), kornea UV/IR, ikili sınırlar; genişletilmiş
  kaynak (C_E, T₂, α_max(t)); C_A, C_B, C_C, K_λ.
- **Tekrarlı darbe**: Kural 1 (tek darbe), Kural 2 (her darbe grubu ve alt grup, T süresi), Kural 3
  (ICNIRP 2013 C_P); Tᵢ (5 µs / 13 µs) içindeki darbeler tek darbe sayılır. Her kural kendi ölçüm
  açıklığıyla ayrı değerlendirilir; en kısıtlayıcı olan belirler.
- **Işın geometrisi**: Gauss (dairesel/eliptik), düz tepe (elips/dikdörtgen); sınırlayıcı açıklıktan geçen
  güç analitik/sayısal integral ile; 1 mm'den küçük ışında ICNIRP dipnotlarına göre tepe değer.
- **NOHD / ENOHD**: oran = 1 noktası sayısal kök bulma ile (açıklık ortalaması, atmosferik zayıflama ve
  dürbün dahil). Işın büyümesi: karesel toplam (ANSI, varsayılan) veya doğrusal (IEC TR 60825-14).
- **Dürbün/teleskop (ENOHD)**: 302,5–4000 nm (IEC 60825-1:2014 Koşul 1 aralığı; dışında cam optik geçirmez).
  Varsayılan 7×50: objektif 50 mm, büyütme M = objektif/7 mm = 7,14×, geçirgenlik görünürde %90, UV ve IR'de %70.
  Afokal optik girişte M × (ölçüm açıklığı) çaplı bölgeyi göze taşır ve ışınımı M² kat artırır: retina (7 mm) için
  etkin giriş 50 mm, kornea (1 mm) için ≈ 7 mm — IEC Koşul 1 ölçüm açıklıklarıyla aynı. UV/IR'de küçük ışın
  kuralı daraltılmış (göze ulaşan) ışına uygulanır. Uzak alanda ENOHD/NOHD = √(τ·M²) (UV/IR 5,98; görünür 6,78).
- **OD**: en kötü durum (tüm güç açıklıktan), çıkışta ve gözlem mesafesinde; mesafe–OD grafiği.
  - Mesafe ekseni logaritmiktir (10 katlar koyu, 2…9 katları soluk; yer varsa 2 ve 5, dar eksende 3 katları
    etiketli). Dikey eksen log₁₀(maruziyet / MPE) değeridir: sıfırın üstü gereken OD, altı 0,1 × MPE'ye kadar
    yeşil "MPE altında" bandıdır. Eğriler sıfırda kesilmez; böylece OD'nin sıfıra çok yakın seyrettiği yerler
    (ör. 1 mW He-Ne'de OD 0,009) sıfırla karışmaz ve her eğrinin MPE çizgisini kestiği yer görünür.
  - NOHD, dürbünle ENOHD ve türbülans paylı NOHD kesik dikey çizgilerle işaretlenir; her biri kendi eğrisinin MPE
    çizgisini kestiği noktadır. Grafik aralığının dışında kalan ya da sonsuz olan işaret çizilmez.
  - Değer okuma: fareyle üzerine gelme, dokunup sürükleme ya da klavye (Tab ile odak, ←/→, Shift ile 10 adım,
    Home/End, Esc) ile seçilen mesafede her eğrinin değeri gösterilir — MPE aşılıyorsa gereken OD, aşılmıyorsa
    maruziyet / MPE oranı. Değerler çizimden değil, hesap motorundan o mesafe için hesaplanır; ekran okuyucuya
    klavye hareketlerinde duyurulur. Raporun durağan grafiğinde bu etkileşim yoktur.
  - İki ayrı (yakın/uzak) grafik yerine tek logaritmik grafik kullanılır: tehlike mesafeleri 5–8 basamağa yayılır,
    uzak alanda 1/r² düşüşü düz çizgi olur (her 10 kat mesafede yaklaşık 2 OD) ve eğriler kesintisiz kalır.
- **EN 207**: D / I / R / M modları, LB1–LB10; 400–1400 nm tekrarlı darbede N^¼ (N = f × 10 s, 5 s
  seçilebilir); ortalama güç için D seviyesi. **EN 208**: RB1–RB5 (görünür ayar gözlüğü).
- **Yaygın yansıma**: Lambert yüzey, E = ρ·P·cos θ / (π·r²); nokta kaynak (varsayılan) veya C_E ile.
- **Deri**: MPE katı, NSHD; 1400 nm üstünde geniş alan düzeltmesi.
- **Mercek**: odaktan tehlike mesafesi (ıraksama 2·atan(b/2f)); **fiber**: çok modlu (φ₆₃ = 2·NA/1,7, ANSI) ve
  tek modlu (Gauss uzak alan).

## Sınır değer setleri

| | ICNIRP 2013 / IEC 60825-1:2014 | 2006/25/AT Ek II |
|---|---|---|
| Retina, 10 ps (2006/25/AT: 1 ns) – 5 µs (18 µs) | 2·10⁻³ C_E J/m² | 5·10⁻³ C_E J/m² |
| 1050–1400 nm kısa darbe | 2·10⁻² C_C C_E J/m² (≤ 13 µs) | 5·10⁻² C_C C_E J/m² (≤ 50 µs) |
| C_C, 1200–1400 nm | 8 + 10^{0,04(λ−1250)} (çok büyür) | 8 (sabit) |
| α_max | süreye bağlı (5 → 100 mrad) | 100 mrad (sabit) |
| Darbe gruplama süresi | Tᵢ = 5 / 13 µs (retina) | T_min = 1 ns (UVA), 18 / 50 µs (retina), 1 ms – 10 s (IR) |
| Kural 3 | Retina termal; kısa darbede yalnız t > 0,25 s ve N > 600 ise 5·n^−0,25 | Tüm termal sınırlar (UVA, retina, IR kornea), C_P = N^−0,25 |
| 302–315 nm | 1 nm basamaklar (üst kenar değeri) | Her nm için tek değer (aradaki dalga boyunda alttaki satır) |
| Deri açıklığı > 100 µm | 11 mm | 3,5 mm |
| < 1 mm ışında tepe değer | Var (Tablo 5/7 dipnotları) | Yok |

**En koruyucu** modda iki setin her kuralı kendi açıklığı ve gruplama süresiyle ayrı ayrı değerlendirilir; her mesafedeki
oran tüm kriterlerin en büyüğüdür. Sonuç ekranı belirleyici sınırın hangi setten geldiğini ve diğerine göre kaç kat
kısıtlayıcı olduğunu gösterir (ör. 532 nm 10 kHz Q-anahtarlı lazerde 2006/25/AT Kural 3 belirler; 532 nm 10 Hz'de
ICNIRP 2013'ün 2·10⁻³ J/m² değeri belirler).

## Atmosferik türbülans (sintilasyon) payı: +1 OD

Açık havada uzun ışın yolunda sıcaklık farklarının oluşturduğu türbülans hücreleri zayıf, anlık mercekler gibi davranır;
ışında sıcak noktalar oluşur ve yerel ışınım ortalamanın üstüne çıkabilir. "Optik destekli bakış ve atmosfer" bölümündeki
seçenek açıkken (varsayılan) ışınım **×10, yani +1 OD** pay kabul edilir ve **ayrı sonuç** olarak gösterilir:

- türbülans paylı NOHD (uzak alanda standart NOHD'nin √10 ≈ 3,16 katı) ve dürbünle ENOHD,
- gözlem mesafesinde OD (+1), önerilen en az OD (standart öneri + 1),
- EN 207 seviyeleri (yoğunluk ×10 → her LB +1), grafikte ayrı eğri, raporda öneri ve kontrol önlemi.

Standart (paysız) sonuçlar değişmez. Ölçüm açıklığına giren enerji ışının toplam enerjisini aşamayacağından mesafeye bağlı
paylı değerler "tüm güç göz bebeğinde" (en kötü durum) üst sınırıyla kırpılır; gözlük önerisindeki +1 ise bu sınırın üstünde
ek güvenlik payıdır. Kapalı ortamdaki kısa ışın yollarında seçenek kapatılabilir.

Pay çıkış açıklığında (r = 0) uygulanmaz, çünkü orada türbülanslı yol yoktur. Paylı NOHD/ENOHD araması bu yüzden çıkışın hemen
ötesinden (r → 0⁺) başlar. Böylece çıkışta MPE'nin altında kalan, ama tüm gücü göz bebeğine girdiğinde tehlikeli olan geniş
ışınlarda da paylı mesafe bulunur. Örnek: 532 nm, 5 mW, 20 mm ışında standart NOHD yoktur, türbülans paylı NOHD 45,5 m'dir.
Motor 1.3.0'da bu vakalarda paylı mesafe 0 çıkıyordu; 1.3.1'de düzeltildi.

Kaynaklar arasında bu konuda görüş birliği yoktur:

| Kaynak | Sintilasyon için tutum |
|---|---|
| ICNIRP 2013 (ölçüm bölümü) | Sintilasyon kaynaklı sıcak noktalar ≥ 3,5 mm ortalama açıklıklarda nadiren önemli artış yaratır |
| ANSI Z136.6-2015 Ek C (bilgilendirici) | Işın içindeki yerel artış/azalışlar tehlike değerlendirmesini değiştirmez |
| JSP 390 (İngiltere MSB, 2005), Bölüm 3 Ek A | Hesaba katılmalı: OHD_S = 2,66^(N_I/N_max)·N_I, C_n bilinmiyorsa 2,66·N_I (uzak alanda ≈ ×7 ışınım ≈ +0,85 OD) |

+1 OD, JSP 390'un doygun durumdaki katsayısının yukarı yuvarlanmış ve biraz daha muhafazakâr hâlidir.

## Muhafazakâr seçimler (standartlar arası farklar)

| Konu | Uygulama |
|---|---|
| 302–315 nm UV fotokimyasal sınır | ICNIRP 2013 1 nm'lik basamakları ile IEC/ANSI sürekli C₂ = 10^{0,2(λ−295)} J/m² değerinin **küçüğü** |
| 1200–1400 nm | ICNIRP retina sınırına ek olarak **ANSI Z136.1-2014 kornea/lens sınırı** (K_λ = 10^{0,01(1400−λ)}) ve ICNIRP göz ön bölümü ikili sınırı (2 × deri MPE) |
| 1 ns altı UV/IR ve deri | E ≤ H(1 ns)/1 ns ile ICNIRP geçici önerisi (1 ns sınırının %10'u) değerlerinin küçüğü |
| 100 fs altı retina | Tepe ışınım 100 fs sınırıyla sınırlı (ICNIRP önerisi) |
| < 1 mm ışın | UV/IR göz (t < 0,35 s) ve deride açıklık ortalaması yerine gerçek (tepe) değer (ICNIRP Tablo 5 ve 7 dipnotları) |
| Kural 3 | ICNIRP 2013: τ ≤ Tᵢ, T > 0,25 s ve N > 600 ise C_P = 5·n^−0,25 (ANSI 2014 nokta kaynakta uygulamaz) |
| Varsayılanlar | Nokta kaynak, zayıflama yok, karesel ışın büyümesi, UV için 30 000 s, EN 207 için 10 s pencere |

Standart tablolarındaki yuvarlamadan doğan küçük basamaklar olduğu gibi uygulanır (ör. 5 µs'de
2,0·10⁻³ → 1,903·10⁻³ J/m², −%4,8; 13 µs'de −%2,7; nokta kaynakta 10 s'de −%1,2).

## Doğrulama

**Açılış öz-denetimi** — Program her açıldığında 64 test vektörünü çalıştırır (ICNIRP ve 2006/25/AT tablolarından
elle hesaplanmış değerler, EasyHaz LSO örnek dosyalarındaki sonuçlar, yayımlanmış EN 207/208 örnekleri).
Biri bile başarısız olursa kırmızı uyarı bandı çıkar. Başlıktaki yeşil rozete tıklayarak ayrıntıyı görebilirsiniz.

**Geliştirme testleri** — `node --test test/*.test.js` (Node ≥ 18; Node 18 ve 24 ile denenir): 88 test.

- ICNIRP Tablo 5, 7, 8 satır noktaları; düzeltme faktörleri; ölçüm açıklıkları
- Tüm dalga boylarında MPE'nin süreyle azalmadığı (bilinen tablo basamakları hariç) ve sürekliliği
- Açıklık integrallerinin kaba kuvvet 2B integral ve elle hesaplanan alanlarla karşılaştırması
- NOHD'nin kapalı formüllerle (ANSI ve IEC TR), mercek ve fiber formülleriyle karşılaştırması
- Kural 3 durumlarının tümü, Tᵢ gruplama, geçersiz girişlerin reddi, 300 rastgele girişte tutarlılık
- EN 207: Lasermet örneği (532 nm, 1 mJ, 7 ns, 10 kHz, 2 mm → **D 532 LB6 + R 532 LB7**), lasersafety ve
  Innsbruck örnekleri; EN 208 RB seviyeleri
- Grafik: NOHD / ENOHD / türbülans NOHD işaretlerinin motorun mesafeleriyle aynı yerde olduğu, çizilen eğrilerin MPE
  çizgisini bu mesafelerde kestiği (yeşil DPSS ve UV'de %0,5, He-Ne'de %2 içinde), gözlem noktasının motor değerinde
  durduğu, aralık dışı ve sonsuz değerlerin çizilmediği, eksen etiketlerinin kısa ve 10 000 km'lik eksenlerde çakışmadığı; değer okumanın motorla ve çizilen eğrilerle
  aynı olduğu, MPE'nin hemen altının "1 × MPE" diye yuvarlanmadığı
- Türbülans payı: 400 rastgele girişte paylı NOHD/ENOHD'nin paylı eğrinin MPE çizgisini kestiği yer olduğu, çıkışta MPE altı
  ama paylı tehlikeli ışında mesafenin 0 çıkmadığı
- Form: içe aktarılan ya da eski oturumdan gelen bozuk durum (listede olmayan birim veya seçim, metin "false") istisna
  atmaz, alan hatası verir, hesap yapılmaz; ekranda önceki girişin sonucu kalmaz
- Rapor ve metinler: kullanılan her setin faktörleri ayrı yazılır (2006/25/AT'de T_min ve C_P), uygulanmayan dürbün
  "Evet" diye yazılmaz, notlarda ondalık virgül, yüzde "%x" yazımı, NOHD yokken karar metni; Android köprüsüyle kaydetme
- Stil sözleşmesi: telefon genişliğinde menü ve diyalog başlıkları ekrana sığar, başlık yapışkan değildir; koyu ve açık
  temada vurgu rengi üstündeki yazının kontrastı ≥ 4,5:1 (WCAG AA). Yerleşim ayrıca tarayıcıda 375 px'te ölçüldü.

**Kentek EasyHaz LSO 2014 (ANSI Z136.1-2014) ile çapraz doğrulama** — Kullanıcının EasyHaz çalışma kitabı
LibreOffice'te **makrolar kapalıyken** salt okunur açıldı, hücre formülleri yeniden hesaplatıldı
(`tools/easyhaz_oracle.py`). 400 rastgele vaka × 4 gözlem mesafesi ve 64 dalga boyu × 40 sürelik MPE taraması:

| Çıktı | n | Eşit | Lazer Emniyet daha koruyucu | Daha az koruyucu |
|---|---:|---:|---:|---:|
| OD (gözlem mesafesi) | 1600 | 1478 | 122 | **0** |
| En kötü durum OD | 400 | 344 | 56 | **0** |
| Yaygın yansıma NHZ | 400 | 329 | 71 | **0** |
| Yaygın yansıma OD | 361 | 353 | 8 | **0** |
| Deri yaygın NHZ | 289 | 285 | 4 | **0** |
| Deri MPE katı | 320 | 222 | 98 | **0** |
| Fiber OD | 128 | 118 | 10 | **0** |
| Kural 1 / Kural 2 MPE | 172 / 172 | 149 / 168 | 23 / 4 | **0** |
| Mercek OD (±0,06 OD tolerans) | 109 | 103 | 6 | **0** |
| MPE taraması (göz) | 2176 | 2069 (%95,1) | 107 | **0** |

Örnek dosyalar da birebir tutar: CO₂ kesici 2 kW → NOHD **1504 m**, OD 4,18 / 5,318, yaygın NHZ 0,798 m;
Surelite Nd:YAG 532 nm → OD 6,742, 100 m'de 5,168.

Farkların nedenleri (tümü belgelenmiştir):

1. **ICNIRP Kural 3** (C_P = 5·n^−0,25) — EasyHaz/ANSI 2014 nokta kaynakta uygulamaz (68 vaka).
2. **< 1 mm ışında tepe değer kuralı** (UV/IR göz, deri) — EasyHaz açıklık ortalaması kullanır.
3. **Kural 2 alt grup taraması** — darbe dizisinin her alt grubu ayrıca denetlenir.
4. **EasyHaz hataları**: sürekli ve tekrarlı modda 302–315 nm için t < 10 s fotokimyasal sınırı atlıyor;
   1200–1400 nm'de bazı süre aralıklarında ikili sınırın minimumu yerine kornea değerini raporluyor;
   1400–1450 nm deri MPE'si 5 s'de süreyle azalan (fiziksel olmayan) bir değer veriyor.
5. **1400–1500 nm, t < 4 s** — EasyHaz ICNIRP/IEC'nin 1 kJ/m² değerinin 3 katını kullanıyor; burada ICNIRP uygulanır.
6. **UV deri, t ≥ 1000 s** — ANSI 1 mW/cm², ICNIRP 2013 10 kJ/m² (daha düşük) — ICNIRP uygulanır.
7. **302 nm sınırı** — ANSI 302,0 nm'de 30 J/m², burada sürekli formül (25,1 J/m²).
8. **Mercek, çok hızlı odaklama (b/f > 0,2)** — EasyHaz farklı bir ıraksama modeli kullanıyor; fark ≤ 0,06 OD
   (bu tek durumda EasyHaz biraz daha yüksek OD verebilir).

UV/IR açıklık geçişi ICNIRP/IEC'ye göre 0,35 s'dedir (ANSI 0,3 s); etkisi < 0,02 OD.

**2006/25/AT setinin doğrulaması** — Direktif tabloları AB Resmî Gazetesi'nin (L 114, 27.4.2006) kendisinden okundu.
Bağımsız referans olarak EasyHaz'ın `Support Documents` klasöründeki 2010 tarihli 12 örnek dosyası kullanıldı; bu dosyalar
ANSI Z136.1-2007 kurallarıyla hesaplanmıştır (5·10⁻³ J/m², C_P = N^−0,25, T_min 18/50 µs — 2006/25/AT ile aynı kuşak):

- 11 dosyada MPE, gözlem mesafesinde ve en kötü durum OD, NOHD, fiber NOHD, yaygın yansıma NHZ ve OD birebir aynı
  (ör. Surelite III 532 nm: 3,799·10⁻³ J/m², OD 6,463, NOHD 28 130 m, yaygın NHZ 5,967 m).
- Surelite III-10 UV (355 nm, 10 Hz): direktif Tablo 2.6 315–400 nm için T_min verdiğinden Kural 3 UV termal sınırına da
  uygulanır; ANSI 2007 uygulamaz → bu program daha koruyucu (OD 4,53, EasyHaz 4,28).
- Mercek (lens-on-laser) NHZ farkı ≤ %0,6.

Ayrıca 200 rastgele girişte "en koruyucu" modun iki setin en kötüsüne eşit olduğu (OD, NOHD, NHZ, deri) test edilir.

## Kapsam dışı

Lazer sınıflandırması (AEL), çoklu dalga boyu toplama, taramalı ışınlar, darbe grupları (burst),
aynasal yansıma geometrisi. 2006/25/AT setinde radyans biçimindeki fotokimyasal sınırlar ve γ görüş alanı ayrıntısı
uygulanmaz (nokta kaynak varsayımı, daha koruyucu). Bu durumlarda her bileşeni ayrı analiz edip en kötüsünü esas alın veya
uzman değerlendirmesine başvurun.

## Klasör yapısı

```
index.html            arayüz
baslat.sh             varsayılan tarayıcıda açar
css/app.css           stiller (açık/koyu tema)
js/core/              hesap motoru (DOM'suz; Node ve tarayıcıda aynı kod)
  mpe.js              ICNIRP 2013 MPE tabloları, düzeltme faktörleri, açıklıklar
  mpe_aord.js         2006/25/AT Ek II maruziyet sınır değerleri (Tablo 2.2–2.6)
  beam.js             ışın geometrisi ve açıklık integralleri
  analysis.js         kurallar, NOHD/OD, yansıma, mercek, fiber
  eyewear.js          EN 207 / EN 208
  units.js            sayı ayrıştırma, birimler, Türkçe biçim
  selftest.js         gömülü öz-denetim vektörleri
js/ui/                form, sonuç ekranı, envanter, rapor, yardım, örnekler
test/                 Node testleri; test/data: EasyHaz 2014 doğrulama verisi ve 2010 örnek dosyaları
tools/build-single.js tek dosya derlemesi → dist/LazerEmniyet.html
tools/easyhaz_oracle.py  EasyHaz çapraz doğrulama aracı (LibreOffice UNO, makrosuz)
```

## Geliştirme

```bash
node --test test/*.test.js
```

```bash
node tools/build-single.js
```

Hesap motorunda bir değişiklikten sonra testleri çalıştırın ve tek dosya sürümünü yeniden üretin.
EasyHaz çapraz doğrulamasını yenilemek için `tools/easyhaz_oracle.py` dosyasının başındaki talimatlara bakın.

Klasör bir git deposudur. İlk commit `1be12d6`, inceleme öncesi v1.3 durumudur. Her düzeltme ayrı bir commit'tir;
`git log` ile görülebilir.

## Sürüm notları

**Motor 1.3.1 (16.11.2026)** — Satır satır inceleme. ICNIRP 2013 metniyle karşılaştırılanlar:
Tablo 2, 3, 4, 5, 7, 8; Tablo 5'in c ve d dipnotları; Kural 1–3 ve C_P koşulları; 1 ns altı ara yaklaşım.
Motorda tablo hatası bulunmadı. Düzeltilenler:

- **Türbülans paylı NOHD/ENOHD** — çıkışta MPE altı, ama tüm güç göz bebeğinde tehlikeli ışınlarda 0 çıkıyordu.
  Rastgele vakaların yaklaşık %2'si bu durumdaydı; ayrıntı "Atmosferik türbülans" bölümünde.
- **Bozuk kayıt** — içe aktarılan ya da eski oturumdan gelen kayıtta listede olmayan bir birim veya seçim vardıysa
  hesap sessizce duruyordu. Form yeni lazeri, sonuç alanı önceki lazerin sonucunu gösteriyordu. Artık alan hatası
  verilir ve sonuç alanı temizlenir. Geçersiz ışın ölçütü de artık sessizce 1/e sayılmaz.
- **Telefon genişliği** — Örnekler menüsü ve envanter düğmeleri ekrana sığar; başlık yapışkan değildir.
- **Koyu tema** — mavi düğme yazısının kontrastı 2,5:1'den 7,7:1'e çıktı.
- **Rapor** — yalnız 2006/25/AT seçiliyken artık bu setin faktörleri yazılır (T_min, C_P). Dürbün uygulanmayan
  dalga boyunda "Evet" yazmaz. Dürbünle hesaplanan OD belirtilir.
- **Metinler** — notlarda ondalık virgül, yüzde "%x" yazımı. 1200–1400 nm ikili sınır bilgisi doğru ve not
  olarak verilir. NOHD yokken karar metni düzeltildi.
- **Envanter** — özeti olmayan kayıt kopyalanabilir; JSON içe aktarma klavyeyle seçilebilir.
- **Android** — WebView kabuğu için köprü: dosya kaydetme, PDF yazdırma, geri tuşu.

Eski (1.3.0) ve yeni motor 3000 rastgele vakada karşılaştırıldı. Standart çıktılar birebir aynı: OD, NOHD, ENOHD,
yaygın yansıma, deri, EN 207. Yalnız türbülans paylı NOHD (47 vaka) ve ENOHD (10 vaka) 0'dan doğru değere geçti.
EasyHaz karşılaştırması standart çıktılar üzerindedir, bu yüzden sonucu değişmez. `easyhaz.test.js` kayıtlı EasyHaz
verisiyle yeniden çalıştırıldı ve geçti: hiçbir vakada daha az koruyucu sonuç yok.

İncelemede tam 400 ve 1400 nm için 2006/25/AT T_min değerinin komşu gruptan alınması da denendi. Bazı ultra kısa
darbe vakalarında bu daha az koruyucu çıktı (400 nm, 1 ps, 1 MHz: NOHD 436 m → 224 m), bu yüzden geri alındı.
Tablo 2.6'nın harfiyen aralıkları geçerlidir.

Kaynakla teyit edilemeyenler (daha koruyucu yönde bırakıldı):
- 2006/25/AT, 315–400 nm, t > 10³ s: kod 10⁴ J/m² sabit kullanır. Yalnız "Yalnız 2006/25/AT" modunu etkiler.
- EN 208'de N^¼ için darbe sayım penceresi: EN 207 ile aynı pencere kullanılır.

## Kaynaklar

- ICNIRP (2013). Guidelines on limits of exposure to laser radiation of wavelengths between 180 nm and
  1,000 µm. Health Phys. 105(3):271–295 — https://www.icnirp.org/cms/upload/publications/ICNIRPLaser180gdl_2013.pdf
- IEC 60825-1:2014 (TS EN 60825-1), Ek A; IEC TR 60825-14
- Directive 2006/25/EC, Annex II (OJ L 114, 27.4.2006, s. 38–59) — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006L0025
- ÇSGB, Yapay Optik Radyasyon Kaynaklarıyla Yapılan Çalışmalarda Sağlık ve Güvenlik Önlemleri Rehberi —
  https://csgb.gov.tr/Media/smfpud35/yapay_optik_radyasyon_kaynaklariyla_yapilan_calismalarda_saglik_ve_guvenlik_onlemleri_rehberi.pdf
- ANSI Z136.1-2014 (Kentek EasyHaz LSO 2014 v1.07 üzerinden karşılaştırma)
- ANSI Z136.6-2015, Ek C (örnek sayfalar) — https://www.lia.org/sites/default/files/pdf/ansi-standards/samples/ANSI%20Z136.6_sample.pdf
- JSP 390 Military Laser Safety (2005), Bölüm 3 Ek A — https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/49543/jsp390_military_laser_safety_2005edition.pdf
- EN 207:2017 ve EN 208 koruma seviyesi tabloları — https://en.wikipedia.org/wiki/EN_207 ;
  hesap yöntemi ve örnek: https://www.lasermet.com/resources/en-207-ce-marking-and-laser-protective-eyewear/ ;
  https://lasersafety.readthedocs.io/en/latest/understanding/choosing_eyewear.html ;
  https://www.uibk.ac.at/en/exphys/research/quantumoptics/laser-goggle-calculator/tutorial/
