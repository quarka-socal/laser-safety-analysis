# Lazer Emniyet Analizi

Lazer tehlike analizi yazılımı: **MPE**, **NOHD / ENOHD**, gerekli **optik yoğunluk (OD)**,
**EN 207 / EN 208** göz koruyucu seviyeleri, **yaygın yansıma**, **deri**, **mercek (lens-on-laser)**
ve **fiber optik** tehlikeleri; envanter ve yazdırılabilir rapor. Sahada maruziyet şüphesi için **Amsler Grid testi**.
Türkçe ve İngilizce arayüz, internet gerektirmez, kurulum gerektirmez. Lisans: **GNU GPL v3 ya da sonrası**
(`LICENSE`). Geliştirici: S.ÖCAL.

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
| Android (11 ve üstü) | `android/` klasöründeki uygulama — aşağıdaki **Android sürümü** bölümü |

Klasör istenen yere taşınabilir; tüm dosyalar göreli yollarla bağlıdır.

## Kullanım

1. **Lazer parametreleri** — sınır değer seti (varsayılan: en koruyucu), dalga boyu, mod (sürekli / tek darbe / tekrarlı darbe), güç veya enerji,
   darbe süresi, frekans. Maruziyet süresi varsayılan olarak standarttan gelir (görünür 0,25 s, IR 10 s,
   UV 30 000 s); düğmelerle değiştirilebilir.
2. **Işın** — çap ve ıraksamayı üretici verisindeki ölçütle girin (genelde 1/e²). Eliptik ve düz tepe
   profiller desteklenir. M² otomatik hesaplanır; kırınım sınırının altındaki değerler uyarı verir.
3. İsteğe bağlı bölümler: dürbünle bakış (ENOHD), atmosferik zayıflama, yaygın yansıma, mercek, fiber,
   deri maruziyet süresi, gözlükteki ışın çapı, lazer kimliği.
4. Sonuçlar her değişiklikte anında güncellenir. Komutlar sol üstteki **☰** menüsündedir: **Yeni analiz**,
   **Örnekler** (12 tipik lazer), **Envantere kaydet** (Ctrl+S), **Envanter**, **Rapor** (yazdırılabilir, PDF) ve
   **Amsler Grid testi**. Sağ üstteki **⋮** menüsünde **Yardım**, **Ayarlar** ve **Hakkında** vardır.

Sayı girişi: ondalık için virgül veya nokta (`1,5` = `1.5`), bilimsel gösterim `1e-9`, `2x10^-4`.
Binlik ayırıcı kullanılmaz; `1.000` gibi belirsiz girişler uyarı verir. Her alanın altındaki satır
girdinin nasıl yorumlandığını gösterir (ör. `= 1064 nm`).

Envanter bu bilgisayarda tarayıcının yerel deposunda tutulur. Yedek için **Envanter → JSON dışa aktar**;
Excel için **CSV**.

### Ayarlar (⋮ → Ayarlar)

| Ayar | Seçenekler | Varsayılan |
|---|---|---|
| Tema | Sistem / Açık / Koyu | Sistem |
| Dil / Language | Türkçe / English | Türkçe |
| Açıklamalar | Dokununca göster / Her zaman göster | Dokununca göster |

Ayarlar bu cihazda saklanır.

**Açıklamalar:** Ekranı sade tutmak için alan açıklamaları gizlidir. Etiketin yanındaki **(i)** düğmesiyle açılır.
Sonuçlardaki yöntem notları "Açıklama" satırıyla açılır. Notlar ve varsayımlar da katlanmış bir başlık altındadır.
Uyarılar ve tehlike sonuçları her zaman görünür.

**Dil:** İngilizce seçilince her şey İngilizce olur: arayüz, sonuçlar, rapor, CSV başlıkları, yardım ve motorun ürettiği
uyarı, not ve formül metinleri. Sayılar İngilizce yazımla gösterilir: ondalık nokta, "90%", saat için "h".
- Çeviri yalnız gösterim katmanındadır: `js/ui/i18n.js` ve `js/ui/lang_en.js`. Hesap motorunun kodu ve sayısal sonuçları
  dilden bağımsızdır.
- 2006/25/AT İngilizce görünümde 2006/25/EC olarak yazılır.
- Kullanıcının girdiği metinler (lazer adı, notlar) çevrilmez.

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

**Geliştirme testleri** — `node --test test/*.test.js` (Node ≥ 18; Node 18 ve 24 ile denenir): 114 test.

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
- Dil: kaynak koddaki her çeviri anahtarının İngilizce karşılığı vardır. Denetim 12 örnek ve 160 rastgele girişle yapılır.
  İngilizce sonuç ekranında, raporda, yardımda ve öz-denetim adlarında Türkçe harf, Türkçe sözcük, ondalık virgül ya da
  "2006/25/AT" kalmaz. Hesap sonuçları iki dilde aynıdır.

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

## Amsler Grid testi

☰ → **Amsler Grid testi**. Lazer maruziyeti şüphesinde (parlama, ardıl görüntü, görmede leke) merkezi görmeyi her göz
için ayrı yoklayan hızlı bir saha testidir. Tanı koymaz, göz muayenesinin yerini tutmaz.

**Izgara.** Amsler'in standart ızgarası 10 cm × 10 cm, 20 × 20 karedir; kare 5 mm. Yaklaşık 30 cm'den bakılınca
her kare ≈ 1° (2·atan(2,5/300) = 0,955°; tam 1° için 28,6 cm), ızgaranın tamamı ≈ 19° görür. Uygulama kareleri
ekranda da **gerçek 5 mm** çizer. Merkez noktası bir kesişimde kalsın diye ekrana sığan çift sayıda kare gösterilir,
en çok 20 × 20. Telefon dikeyken genişlik çoğunlukla 12–14 kareye yeter (≈ ±6°); yan çevrilince yatay alan genişler.

**Ekran ölçüsü** (öncelik sırasıyla):

| Kaynak | Nasıl | Not |
|---|---|---|
| Kartla ayar | Banka ya da kimlik kartı (ISO/IEC 7810 ID-1, 85,60 × 53,98 mm) ekrana yaslanır, çerçeve kartla çakışana kadar ayarlanır; 50 mm cetvel çizgisiyle de denetlenebilir | Cihaz pikseli/mm olarak saklanır; tarayıcı yakınlaştırması değişse de geçerli kalır |
| Android ekran bilgisi | `DisplayMetrics.xdpi/ydpi` → CSS px/mm = xdpi / 25,4 / devicePixelRatio | xdpi ≠ ydpi (> %5) ya da ekran köşegeni 3,5–14 inç dışında ise "şüpheli" denir ve kart önerilir |
| Varsayım | Tarayıcının 96 px/inç kabulü | Fiziksel değildir: test ekranı kartla ayar yapılmasını ister |

**Akış.** Kişi (ad ya da sicil no), olay ve belirtiler (bulanık görme, leke/kör nokta, birkaç dakikada geçmeyen ardıl
görüntü, ağrı/ışığa hassasiyet) girilir. Önce sağ, sonra sol göz test edilir. Bozuk, eksik ya da karanlık görülen
karelere dokunulur; sürükleyerek birden çok kare işaretlenir. Siyah çizgi/beyaz zemin ya da beyaz çizgi/siyah zemin
seçilebilir. Android'de test süresince ekran açık kalır, parlaklık en yükseğe çıkar ve sayfa yakınlaştırması sıfırlanır.

**Sonuç.**
- İşaretli kare **ya da** belirti varsa: "Bulgu var". Aynı gün göz hekimi (retina muayenesi, mümkünse OCT); olay lazer
  güvenlik sorumlusuna bildirilir. Merkezdeki ±2°'lik alan (orta 4 × 4 kare) tutulmuşsa ayrıca belirtilir.
- İşaret ve belirti yoksa: "bulgu yok", ama **hasarı dışlamaz**. Maruziyet şüphesinde en geç 48 saat içinde göz
  muayenesi; görme azalırsa ya da leke, ardıl görüntü sürerse hemen başvuru; testin birkaç saat sonra tekrarı önerilir.
- Aynı kişinin önceki testi (ad karşılaştırması büyük/küçük harf ve İ/ı farkı gözetmez) bulunursa karşılaştırılır:
  önceki teste göre yeni işaretlenen kare sayısı gösterilir. Bu yüzden lazerle çalışanlar için bir **temel test** kaydı önerilir.

**Kayıt.** Sonuç otomatik olarak bu cihazdaki test geçmişine kaydedilir (`lazerEmniyet.amsler.v1`, en çok 200 test).
Sonuç A4 rapor olarak yazdırılabilir (PDF): kişi, olay, belirtiler, iki gözün işaretli ızgarası, test koşulu, önceki
test, imza alanları. **Kâğıt test yazdır** gerçek boyutlu 10 × 10 cm boş ızgara ve 50 mm denetim çizgisi üretir;
yazdırırken ölçek %100 seçilmelidir.

**Sınırlamalar.** Amsler testinin duyarlılığı sınırlıdır; beyin eksik alanı tamamlayabilir (Crossland ve Rubin 2007).
Lazer hasarı çoğunlukla merkezde kör nokta yapar, çizgilerde eğrilik olmayabilir (Sakaguchi ve ark. 2000). Ekranda
gösterilen ızgara, kare boyu ve mesafe doğru olduğunda kâğıt testle uyumludur (Brucker ve ark. 2019). Test 30 cm
mesafeye dayanır; mesafe ölçülmez, kullanıcıya söylenir.

## Hakkında ve lisans

⋮ → **Hakkında**: geliştirici (S.ÖCAL), uygulama sürümü ve sürüm tarihi (`js/ui/version.js`: `APP_VERSION`,
`APP_DATE`), hesap motoru sürümü, öz-denetim sonucu, derleme zamanı (`tools/build-single.js` tek dosyaya yazar) ve
Android'de uygulama sürüm kodu, cihaz, Android ve WebView sürümü.

Lisans: **GNU Genel Kamu Lisansı sürüm 3 ya da (seçiminize bağlı olarak) daha sonraki bir sürüm**
(SPDX: `GPL-3.0-or-later`). Copyright © 2026 S.ÖCAL. Lisansın tam metni kök klasördeki `LICENSE` dosyasındadır ve
uygulamanın içinde Hakkında penceresinden okunabilir (`js/ui/license.js`; test, iki metnin aynı olduğunu denetler).
Kaynak kodu HTML/JS dosyaları ve `android/` klasörüdür; tek dosya sürümü de küçültülmemiş, okunur kaynak içerir.

## Android sürümü

`android/` klasöründeki uygulama, masaüstündeki doğrulanmış tek dosyalık sürümü (`dist/LazerEmniyet.html`) olduğu gibi
içine gömen çevrimdışı bir **WebView kabuğudur**. Hesap motoru, arayüz, öz-denetim ve rapor masaüstüyle aynı koddur; Android'e
özgü işler küçük bir yerel köprüyle yapılır. Ayrı bir hesap doğrulaması gerekmez.

| Özellik | Android'de |
|---|---|
| Rapor | "Yazdır / PDF" → sistem yazdırma ekranı (PrintManager) → **Save as PDF / PDF olarak kaydet**, A4 |
| JSON / CSV / HTML kaydetme | Sistem dosya seçici (SAF) açılır, konum ve ad seçilir; depolama izni gerekmez |
| JSON içe aktarma | "JSON içe aktar" → sistem dosya seçici |
| Envanter ve son oturum | Uygulamanın kendi deposunda kalıcı (localStorage); kapatıp açınca geri gelir |
| Geri tuşu | Önce açık pencereyi/menüyü kapatır, sonra uygulamadan çıkar |
| Tema ve dil | Uygulama içi Ayarlar (Sistem/Açık/Koyu, Türkçe/English); durum çubuğu şeridi, gezinme çubuğu, Android bildirimleri ve onay pencereleri de seçimi izler |
| Ağ | **INTERNET izni yok, hiçbir izin istenmez.** Sayfa APK'nın içinden, ağa çıkmayan sabit bir https kökenden sunulur |
| Yedek | Bulut yedeği kapalıdır (`allowBackup=false`); envanter yalnız cihazda kalır, yedek için **JSON dışa aktar** |
| Uygulama adı | Ana ekranda ve uygulama listesinde **Laser Safety Analysis** |
| Amsler Grid testi | Ekranın fiziksel piksel yoğunluğu (`screenMetrics`) ile 5 mm kareler; test süresince ekran açık, parlaklık en yüksek, yakınlaştırma sıfır (`testScreen`) |
| Hakkında | Uygulama sürümü ve sürüm kodu, cihaz, Android ve WebView sürümü (`appInfo`) |

Gereksinim: Android 11 veya üstü (minSdk 30); hedef Android 15 (targetSdk 35). Uygulama kimliği `com.quarka.lazeremniyet`.
Sürüm numarası `js/ui/version.js` dosyasındaki uygulama sürümünden otomatik alınır: 1.5.0 → versionName 1.5.0, versionCode 10500.
Hesap motorunun sürümü ayrıdır: `js/core/analysis.js` → `ENGINE_VERSION`, şu an 1.3.1.

### Derleme

Sistem JDK'sında `javac` yoktur; Android Studio'nun JDK'sı kullanılır. Gradle önbelleği dolu olduğundan internet gerekmez:

```bash
cd android
export JAVA_HOME=~/Downloads/android-studio/jbr
./gradlew --offline -Porg.gradle.java.installations.paths=$JAVA_HOME :app:assembleDebug
```

Çıktı: `android/app/build/outputs/apk/debug/app-debug.apk`, yaklaşık 2,6 MB. Klasör Android Studio ile de açılabilir
(Open → `android`).

Derleme `copyWebApp` göreviyle `../dist/LazerEmniyet.html` dosyasını varlık olarak kopyalar. Dosya eskiyse görev derlemeyi
durdurur. Bunun iki ölçütü var: gömülü uygulama ya da motor sürümü kaynaktakiyle aynı değilse, ya da Android köprüsü
(`LazerAndroid`) yoksa. Uyarı mesajı ne yapılacağını söyler.

### Kurulum

- **USB ile** (telefonda Geliştirici seçenekleri → USB hata ayıklama açık):

  ```bash
  ~/Android/Sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  ```

- **Dosya ile**: APK'yı telefona kopyalayıp dosya yöneticisinden açın. Telefon, o uygulama için "bilinmeyen kaynaklardan
  yükleme" iznini bir kez sorar.

### Güncelleme

1. Web kaynaklarında (`js/`, `css/`, `index.html`) değişiklik yapıldıysa önce testleri çalıştırın, sonra tek dosyayı
   üretin: `node --test test/*.test.js`, ardından `node tools/build-single.js`. Hesap motoru değiştiyse
   `ENGINE_VERSION` değerini artırın; Android sürüm numarası buradan gelir.
2. Yukarıdaki komutla APK'yı yeniden derleyin ve `adb install -r` ile üzerine kurun. Aynı bilgisayarın debug anahtarıyla
   imzalı APK verileri korur.
3. Başka bir bilgisayarda derlenen APK farklı anahtarla imzalanır. O zaman önce kaldırmak gerekir ve bu envanteri siler.
   Güncellemeden önce **Envanter → JSON dışa aktar** ile yedek alın.

### Doğrulama (16.11.2026, emülatör: Android 15, WebView 124)

- APK: hiç izin yok; gömülü HTML `dist/LazerEmniyet.html` ile bayt bayt aynı.
- Açılışta öz-denetim rozeti **✓ 64/64**.
- 12 örnek lazer WebView'da (Chrome hata ayıklama protokolüyle) ve masaüstü tarayıcıda yüklendi:
  - Ekranda görünen sonuç kutuları ve karar metinleri **birebir aynı**.
  - Ham sayılar 12 örneğin 8'inde bit bit aynı. Kalan 4'ünde en çok 1 ULP fark var (göreli ≈ 2·10⁻¹⁶). Fark, iki
    Chromium sürümünün (124 ve 156) `Math.pow` sonucunun son bitinden geliyor ve hiçbir gösterilen değeri değiştirmiyor.
- Envanter → JSON dışa aktar: dosya seçiciyle `Download/lazer-envanter-20261116.json` yazıldı.
- JSON içe aktar: envanter silindi, dosya seçiciden geri yüklendi ("1 yeni").
- Rapor → Yazdır / PDF → Save as PDF: 3 sayfa A4 PDF. İçeriği `pdftotext` ile kontrol edildi (karar, NOHD 316 m,
  D 532 LB5, motor v1.3.1, öz-denetim 64/64).
- Geri tuşu: ilk basış açık pencereyi kapattı, ikinci basış uygulamadan çıktı.
- Zorla durdurma sonrası: envanter ve son oturum geri geldi.
- Gece modu: sayfa koyu temaya geçti, kayıtlar yerinde.
- Klavye: açıldığında sayfa küçülür, odaktaki alan görünür kalır; ondalık klavyede virgül ve nokta var.

Uygulama 1.4.0 (aynı gün, aynı emülatör):
- Sonuç ekranının bütün metni 12 örnekte masaüstüyle karşılaştırıldı: kutular, karar, tablolar, formüller, notlar.
  SHA-256 parmak izi **iki dilde de aynı** (İngilizce `2b6877a9…`, Türkçe `dabf77d4…`).
- Uygulama içinde İngilizce ve Koyu seçilince durum şeridi ve gezinme alanı koyulaştı. Android onay penceresi
  İngilizce çıktı ("Laser Safety", Cancel/OK).

Uygulama 1.5.0 (aynı gün, aynı emülatör: 1080 × 2400, 420 dpi):
- APK: etiket **Laser Safety Analysis**, versionCode 10500, izin yok; gömülü HTML `dist` ile bayt bayt aynı. Öz-denetim 64/64.
- ☰ çekmece, ⋮ menü, Hakkında (uygulama 1.5.0 (10500), Android 15 (API 35), WebView 124, derleme zamanı) çalıştı.
  Geri tuşu sırasıyla Amsler adımını, açık pencereyi, çekmeceyi kapattı.
- Amsler: köprüden xdpi 420 → kare 31,496 CSS px = **82,68 cihaz pikseli = 5,00 mm**. Ekran görüntüsünde 13 dikey
  çizgi aralığı ortalama 82,5 px, 21 yatay çizgi uç uca 1651,5 px (beklenen 1653,5; piksel yuvarlaması). Gerçek
  dokunuşla (adb) tek kare ve sürükleyerek 10 kare işaretlendi. Test sırasında `KEEP_SCREEN_ON` ve parlaklık 1,0;
  testten çıkınca ikisi de kalktı.
- Kâğıt ızgara → Save as PDF (A4, 1 sayfa), 254 dpi'de ölçüldü: ızgara kenarı **100,0 mm**, 20 × 20 kare (dikey çizgi
  aralığı 4,99 mm), 50 mm çizgisi 49,7 mm (kenar yumuşatma payı). PDF görüntüleyicide de ölçek %100 seçilmelidir.
- Test sonucu → Save as PDF: 1 sayfa A4; kişi, olay, belirti, iki göz ızgarası, test koşulu, imza alanları.
- İngilizce seçiliyken Android onay penceresinin başlığı "Laser Safety Analysis".

Gerçek telefon (Honor 400, MagicOS): APK dosya aktarımıyla İndirilenler klasörüne kopyalandı (1.3.1, 1.4.0, sonra 1.5.0).
Kurulum ve deneme kullanıcıda. USB hata ayıklama açılırsa yukarıdaki otomatik doğrulama telefonda da çalıştırılabilir.
Üreticinin yazdırma ve dosya seçici ekranları farklı görünebilir; akış aynıdır.

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
  version.js          uygulama sürümü ve tarihi (Android sürüm numarası buradan)
  amsler.js           Amsler Grid testi: ızgara geometrisi, ekran ölçüsü, test geçmişi, rapor
  about.js            Hakkında penceresi
  license.js          GPL v3 tam metni (LICENSE ile aynı)
  i18n.js             dil desteği: T() arayüz, X() motor metinleri (kalıplarla, motora dokunmadan)
  lang_en.js          İngilizce sözlük
test/                 Node testleri; test/data: EasyHaz 2014 doğrulama verisi ve 2010 örnek dosyaları
LICENSE               GNU GPL v3 tam metni
tools/build-single.js tek dosya derlemesi → dist/LazerEmniyet.html (derleme zamanını da yazar)
tools/easyhaz_oracle.py  EasyHaz çapraz doğrulama aracı (LibreOffice UNO, makrosuz)
android/              Android uygulaması (WebView kabuğu; dist/LazerEmniyet.html'i gömer)
  app/build.gradle.kts           sürüm js/ui/version.js'ten; copyWebApp görevi
  app/src/main/java/.../MainActivity.kt  WebView, PDF, dosya seçici, geri tuşu, tema/dil köprüsü, kenardan kenara düzen,
                                         Amsler için ekran yoğunluğu ve test ekranı, Hakkında için sürüm bilgisi
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

**Uygulama 1.5.0 (16.11.2026, motor 1.3.1 değişmedi)**
- Yeni üst çubuk: sol üstte **☰** çekmece (Yeni analiz, Örnekler, Envantere kaydet, Envanter, Rapor, Amsler Grid testi),
  sağ üstte **⋮** menü (Yardım, Ayarlar, Hakkında). Başlık tek satır ve yapışkan; telefonda öz-denetim rozeti "✓ 64/64".
- **Amsler Grid testi**: gerçek 5 mm kareler, kartla ekran ayarı, iki göz, dokunarak işaretleme, belirtiler, sonuç önerisi,
  test geçmişi ve aynı kişinin önceki testiyle karşılaştırma, A4 rapor, gerçek boyutlu kâğıt ızgara.
- **Hakkında**: geliştirici S.ÖCAL, sürüm ve tarih, derleme zamanı, GNU GPL v3+ bildirimi ve tam metni. `LICENSE` eklendi.
- Android: uygulama adı **Laser Safety Analysis**; köprüye `screenMetrics`, `testScreen`, `appInfo` eklendi (10500).
- Testler 114 (yeni: amsler.test.js, about.test.js; css ve i18n testleri yeni menüleri ve Amsler ekranlarını kapsıyor).

**Uygulama 1.4.0 (16.11.2026, motor 1.3.1 değişmedi)**
- Ayarlar penceresi: tema (Sistem/Açık/Koyu), dil (Türkçe/English), açıklamalar (dokununca / her zaman).
- Dil desteği: İngilizce arayüz, sonuçlar, rapor, CSV, yardım ve motor metinleri. Sayı yazımı dile göre.
- Sade görünüm: alan açıklamaları (i) düğmesinin arkasında; yöntem notları, notlar ve varsayımlar katlanabilir.
  Uyarılar her zaman görünür.
- Türkçe görünümde de büyük darbe sayıları artık "2,40×10⁹" biçiminde yazılıyor (önce "2.40e+9" idi).
- Android: tema ve dil köprüsü (`setUi`). Sürüm numarası uygulama sürümünden geliyor (10400).
- Testler 92 (yeni: i18n.test.js).

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
- **Android** — `android/` uygulaması ve web tarafında yerel köprü (dosya kaydetme, PDF yazdırma, geri tuşu).
  Tarayıcıdaki davranış değişmez.

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

Amsler Grid testi:
- Amsler M. Earliest symptoms of diseases of the macula. Br J Ophthalmol 1953;37(9):521–537. https://doi.org/10.1136/bjo.37.9.521
- Crossland M, Rubin G. The Amsler chart: absence of evidence is not evidence of absence. Br J Ophthalmol 2007;91(3):391–393.
  https://doi.org/10.1136/bjo.2006.095315
- Sakaguchi H ve ark. Amsler grid examination and optical coherence tomography of a macular hole caused by accidental
  Nd:YAG laser injury. Am J Ophthalmol 2000;130(3):355–356. https://doi.org/10.1016/s0002-9394(00)00547-x
- Barkana Y, Belkin M. Laser eye injuries. Surv Ophthalmol 2000;44(6):459–478. https://doi.org/10.1016/s0039-6257(00)00112-0
- Brucker J ve ark. Ophthalmol Ther 2019;8(3):461–476 (mobil Amsler modülü). https://doi.org/10.1007/s40123-019-0203-9

Lazer güvenliği:
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
