# Güvenlik değerlendirmesi — Laser Safety Analysis 1.5.2

Bu belge iki bölümdür: **Android uygulaması** (aşağıda) ve **PC sürümü** ([PC sürümü](#pc-sürümü) bölümü).

| | |
|---|---|
| Tarih | 16.11.2026 |
| Uygulama | 1.5.2 (Android versionCode 10502), hesap motoru 1.3.1 |
| Dağıtım APK'sı | `LaserSafetyAnalysis-1.5.2.apk` ([GitHub sürümü](https://github.com/quarka-socal/laser-safety-analysis/releases/tag/v1.5.2)), 2 278 899 bayt |
| APK SHA-256 | `db16e69e8333a117842afdc86d2ec6718a63f01c2530d95c09ec4ad7529a595a` |
| İmza sertifikası | `CN=S.OCAL, O=Laser Safety Analysis`, RSA 4096, APK Signature Scheme v3 |
| Sertifika SHA-256 | `e8c9cbff9fd9026be0522150d81a7f0a21884c2d431b88c9816b5cf23687dda0` |
| PC tek dosya | `dist/LazerEmniyet.html`, 453 609 bayt, SHA-256 `b2287ecf1e522c2c65b7b312f610f711466e9e93a40e0fb4df4dbc55b269cab4` |
| Geliştirici | S.OCAL · Lisans GPL-3.0-or-later |

## Sonuç

Hiçbir yazılım için "açığı yoktur" diye matematiksel bir kanıt verilemez. Bu değerlendirmede yapılan, uygulamaya
yönelebilecek her saldırı yolunu tek tek belirlemek ve her birinin kapalı olduğunu **ölçülebilir kanıtla**
göstermektir: APK'nın kendisinin incelenmesi, kaynak kodun taranması, otomatik testler ve gerçek saldırı denemeleri.

İnceleme 8 bulgu üretti: 2 orta, 3 düşük, 3 sertleştirme. **Hepsi 1.5.2'de düzeltildi**, her biri için önce başarısız
olan bir test yazıldı ve düzeltmeden sonra geçtiği görüldü. Kalan riskler (çoğu cihaz ve dağıtım düzeyinde) bu belgenin
sonunda açıkça listelenmiştir.

Kanıtlanan beş temel özellik:

1. **Ağ yok.** Uygulama hiçbir izin istemez (INTERNET dahil). Android, uygulamanın ağ soketi açmasını işletim sistemi
   düzeyinde reddeder; sayfanın İçerik Güvenlik Politikası da her bağlantıyı ayrıca engeller. Veri dışarı gönderilemez.
2. **Dışarıdan veri girişi tek ve güvenli.** Dışarıdan gelen tek veri, kullanıcının dosya seçiciyle açtığı JSON dosyasıdır.
   İçindeki her metin ekrana kaçışlı (zararsız düz yazı olarak) basılır; bir yer atlansa bile politika satır içi betiği çalıştırmaz.
3. **Saldırı yüzeyi küçük.** Tek ekran (ana ekran simgesi), başka bileşen yok; başka uygulamalardan veri kabul edilmez.
4. **Veriler yalnız bu cihazda.** Uygulamaya özel depoda tutulur; bulut yedeği ve cihazdan cihaza aktarım kapalıdır.
5. **Dağıtım sürümü hata ayıklanamaz.** USB ile bağlansa bile `run-as` ve WebView hata ayıklaması kullanılamaz.

## Kapsam ve yöntem

- Kaynak kod: `js/` (arayüz ve hesap motoru), `android/` (Kotlin kabuğu, manifest, Gradle), `tools/build-single.js`.
- APK statik incelemesi: `aapt2` (izinler, manifest), `apksigner` (imza), `dexdump` (derlenmiş kod).
- Otomatik testler: `test/guvenlik.test.js` (11 test); toplam 17 test dosyası, 130 test; Node 24 ve Node 18.
- Dinamik saldırı denemeleri: Chromium (masaüstü), Firefox 160 (PC, `file://`), Android 15 emülatörü (WebView 124).
- Ölçüt: [OWASP MASVS](https://mas.owasp.org/MASVS/) kategorileri ve Android'in resmî güvenlik riski belgeleri.

## Tehdit modeli

Korunan veriler: envanter (lazer bilgileri, sorumlu kişi adları), **Amsler test geçmişi** (kişi adı ve göz bulgusu:
sağlık verisi), ayarlar.

| Saldırgan | Yol | Sonuç |
|---|---|---|
| Kötü niyetli JSON dosyası (e-posta, USB ile gelen "envanter yedeği") | Betik sokma (XSS), veri sızdırma, CSV'de formül | Kapalı (bulgu 2, 3, 5, 7) |
| Telefondaki başka bir uygulama | Dışa açık bileşen, niyet (intent) verisi, görev ele geçirme (StrandHogg), dosya paylaşımı | Kapalı (tek bileşen, minSdk 30) |
| Ağdaki saldırgan | Trafik dinleme, sahte sunucu | Uygulanamaz: ağ yok |
| Cihaza USB/fiziksel erişimi olan kişi | Debug derleme, `run-as`, WebView hata ayıklama, yedekten veri | Kapalı (bulgu 1, 4); cihaz kilidi şart |
| Tedarik zinciri | Harici kütüphane, CDN | Uygulanamaz: harici kütüphane ve ağ yok |

## Bulgular ve düzeltmeler

| # | Bulgu | Önem | Düzeltme (1.5.2) | Kanıt |
|---|---|---|---|---|
| 1 | Dağıtılan APK **debug derlemesiydi** (`debuggable=true`): USB hata ayıklaması açık bir cihazda `run-as` ile uygulama verisi okunabilir, WebView uzaktan hata ayıklanabilirdi. | Orta | Dağıtım (release) derlemesi; GitHub sürümünden itibaren geliştiricinin ayrı dağıtım anahtarıyla imzalı (aşağıda "İmza anahtarı"). | `pkgFlags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ]` (DEBUGGABLE yok); `run-as: package not debuggable`; test |
| 2 | **CSV formül enjeksiyonu** (CWE-1236): `=`, `+`, `-`, `@` ile başlayan ad, konum gibi alanlar CSV Excel/LibreOffice'te açılınca formül olarak çalışabiliyordu (ör. içe aktarılan kötü niyetli JSON'dan). | Orta | Bu hücreler tek tırnakla başlatılır; yalnız sayı olan değerler (ör. `-0,52`) değişmez. | test "CSV formül enjeksiyonu" (6 saldırı biçimi) |
| 3 | **Dış adres yönlendirmesi**: sayfadan gelen her http(s) adresi sistem tarayıcısına veriliyordu. Sayfaya bir şekilde betik sızsaydı veriler adres üzerinden dışarı taşınabilirdi. | Düşük | Uygulamanın kendi adresi dışındaki her adres engellenir; hiçbir şey dışarı açılmaz. | test; emülatörde `location` ve `window.open` denemesi |
| 4 | **Cihazdan cihaza aktarım**: Android 12+ hedefleyen uygulamalarda bazı üreticilerin cihazlarında `allowBackup="false"` cihaz aktarımını kapatmıyor ([Android belgesi](https://developer.android.com/identity/data/autobackup)). "Veriler yalnız bu cihazda" iddiasıyla çelişiyordu. | Düşük | `dataExtractionRules`: bulut yedeği ve cihaz aktarımı tüm uygulama klasörleri için kapalı. | test; `aapt2` manifestte `dataExtractionRules` |
| 5 | İçe aktarmada `__proto__` ve bilinmeyen anahtarlar form durumuna kopyalanıyordu (`Object.assign`). | Düşük | Yalnız tanımlı alanlar ve basit değerler alınır. | test "__proto__" |
| 6 | WebView'da `content://` erişimi varsayılan olarak açıktı (kullanılmıyordu). | Sertleştirme | `allowContentAccess=false`, konum erişimi kapalı. JSON içe aktarma sistem dosya seçicisiyle çalışmaya devam ediyor (denendi). | test; emülatör |
| 7 | İçerik Güvenlik Politikası (CSP) yoktu: kaçış bir yerde atlansaydı ikinci savunma hattı yoktu. | Sertleştirme | Tek dosyadaki **21 betiğin SHA-256 özeti** dışında hiçbir betik, `eval`, ağ bağlantısı, çerçeve, eklenti ve form gönderimi çalışmaz. | test "CSP"; tarayıcıda saldırı denemeleri |
| 8 | "HTML olarak kaydet" ile kaydedilen raporda politika yoktu. | Sertleştirme | Kaydedilen rapor dosyası hiç betik çalıştıramaz (`default-src 'none'`). | test |

## Kanıtlar

### APK (statik inceleme)

- **İzinler: yok.** `aapt2 dump permissions` yalnız paket adını verir; INTERNET, depolama, kamera, konum yok.
- **Bileşenler:** tek etkinlik (MainActivity; ana ekran simgesi için dışa açık). Servis, yayın alıcısı, içerik
  sağlayıcısı yok. Gelen niyetin (intent) verisi ya da ekleri okunmaz.
- **Manifest:** `debuggable` yok, `allowBackup=false`, `dataExtractionRules`, minSdk 30, targetSdk 35.
- **minSdk 30 (Android 11):** görev ele geçirme (StrandHogg) için Android'in önerdiği önlem budur
  ([Android belgesi](https://developer.android.com/privacy-and-security/risks/strandhogg)); JavaScript köprüsüne
  yansıma (reflection) saldırısı yalnız API 17 öncesinde mümkündü.
- **İmza:** APK Signature Scheme v2 ile doğrulandı.
- **Derlenmiş kod:** uygulamanın kendi sınıfları yalnız `MainActivity` ve iç sınıfları. Uygulama kodunda ağ, dinamik
  kod yükleme ya da komut çalıştırma çağrısı yok; tek `loadUrl` sabit adresi, tek `evaluateJavascript` sabit "geri"
  komutunu çalıştırır. Pakette ayrıca Kotlin standart kütüphanesi (uygulama kodundan çağrılmayan URL okuma işlevleri
  dahil) ve derleyicinin ürettiği etkisiz Android yer tutucu sınıfları (yüklenirse `NoClassDefFoundError` fırlatır) var.
- **Gömülü sayfa** `dist/LazerEmniyet.html` ile bayt bayt aynı.
- **JavaScript köprüsü** (`LazerAndroid`): dosya kaydetme (yalnız sistem "kaydet" penceresiyle, kullanıcı yer seçer),
  yazdırma, tema/dil, ekran yoğunluğu, ekranı açık tutma, sürüm bilgisi. Hassas işlev (dosya okuma, kişi listesi, ağ) yok.
  Köprü yalnız uygulamanın kendi sayfasında bulunur: başka hiçbir adres yüklenemez (her istek 404, gezinme engelli).

### Web kodu (kaynak taraması)

- `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `eval`, `new Function`, dış adres, `<a href>` ve satır içi olay
  işleyicisi (`onclick=` vb.) **hiç yok** (tarama ve test).
- Kullanıcı verisinin basıldığı her yer (sonuç ekranı, rapor, envanter, Amsler, Hakkında) `esc()` ile kaçışlı.

### Otomatik testler (`test/guvenlik.test.js`)

- **XSS:** 6 saldırı metni (`<img onerror>`, `<svg onload>`, `<script>`, `<iframe src=javascript:>`, öznitelikten çift
  ve tek tırnakla kaçış) bütün kimlik alanlarına, sayı ve seçim alanlarına (hata yolu), Amsler kişi/olay adlarına ve
  köprüden gelen cihaz bilgisine verildi: sonuç ekranında, raporda, kaydedilen HTML raporda, Amsler ekranlarında ve
  Hakkında'da kaçışsız tek parça bile yok.
- CSV formül enjeksiyonu, `__proto__`, CSP (her betiğin özeti var, fazladan izin yok, satır içi işleyici yok, `javascript:` yok),
  kaydedilen raporun politikası, Android yapılandırması (WebView ayarları, gezinme, manifest, yedek kuralları, release imzası).
- Bütün test takımı: 130 test, Node 24 ve Node 18'de geçiyor.

### Saldırı denemeleri

**Masaüstü (Chromium, politika etkin)**
- Bütün akışlar (örnek yükleme, rapor, yardım, Hakkında ve lisans metni, ayarlar, Amsler kalibrasyon/test/sonuç, envanter)
  **sıfır politika ihlaliyle** çalıştı; öz-denetim 64/64.
- Her alanında saldırı metni olan 5 kayıtlık kötü niyetli JSON içe aktarıldı; envanter, rapor ve Amsler açıldı:
  **hiçbir betik çalışmadı**, sayfaya tehlikeli öğe ya da öznitelik girmedi.
- Politikanın ikinci savunma hattı (kaçış atlanmış gibi doğrudan sayfaya ekleme): satır içi olay işleyicisi
  (`script-src-attr`), sonradan eklenen betik (`script-src-elem`), metinden kod derleme (`script-src eval`),
  `fetch` ve `sendBeacon` (`connect-src`), resimle veri sızdırma (`img-src`), çerçeve (`frame-src`) **engellendi**.

**PC (Firefox 160, `file://`):** tek dosya sürümü politika etkinken eksiksiz çalışıyor.

**Android (emülatör, Android 15, WebView 124)**
- `window.open` açılmadı. Dış adrese yönlendirme engellendi: ön planda uygulama kaldı, sayfa adresi değişmedi,
  sistem tarayıcısı açılmadı.
- `https://`, `http://`, `content://` ve `file://` adreslerine bağlantı engellendi.
- Kötü niyetli JSON içe aktarıldı: betik çalışmadı, sokulmuş öğe yok.
- İşletim sistemi: uygulamanın kimliğiyle ağ soketi açılamıyor (`socket: Operation not permitted`); aynı cihazda kabuk
  kullanıcısı internete erişebiliyor.
- Dağıtım sürümü: `run-as` reddedildi. Debug sürümün üzerine kurulduğunda envanter, Amsler geçmişi ve ayarlar korundu.
  JSON içe aktarma (sistem dosya seçicisi) çalıştı: "Imported: 1 new".

## OWASP MASVS'ye göre özet

| Kategori | Durum |
|---|---|
| STORAGE (veri saklama) | Uygulamaya özel depo; bulut yedeği ve cihaz aktarımı kapalı; geçici kayıt dosyası önbellekte, işten sonra silinir |
| CRYPTO (şifreleme) | Uygulanmaz: gizli anahtar, parola ya da şifreli veri yok |
| AUTH (kimlik doğrulama) | Uygulanmaz: hesap ve sunucu yok |
| NETWORK (ağ) | İzin yok; işletim sistemi düzeyinde engel kanıtlandı; politika `connect-src 'none'` |
| PLATFORM (platform etkileşimi) | Tek bileşen; WebView'da dosya/içerik erişimi kapalı, yalnız kendi sayfası, gezinme engelli, köprü dar; minSdk 30 |
| CODE (kod kalitesi) | Girdi doğrulama, XSS kaçışı, CSV koruması testli; dinamik kod yükleme yok; dağıtım sürümü hata ayıklanamaz |
| RESILIENCE (tersine mühendisliğe direnç) | Hedeflenmedi: GPL açık kaynak; kod karartmanın güvenlik katkısı yok |
| PRIVACY (gizlilik) | Veri toplama, analitik, reklam, ağ yok; Amsler sağlık verisi yalnız cihazda, dışa aktarma kullanıcının elinde |

## Kalan riskler ve öneriler

1. **İmza anahtarı (giderildi, 16.11.2026).** GitHub'da yayınlanan APK, geliştiricinin ayrı ve parolalı dağıtım anahtarıyla
   imzalıdır (RSA 4096; sertifika SHA-256 yukarıda). Anahtar deposu depoda ve derleme dosyalarında yoktur, yalnız geliştiricinin
   bilgisayarında (`-rw-------`) ve yedeğindedir; parola yalnız imzalama anında terminalde sorulur (`tools/apk-imzala.sh`).
   Bundan önce telefona elle kopyalanan sürümler (≤ 1.5.2) Android'in hata ayıklama anahtarıyla imzalıydı; Android farklı
   anahtarla imzalanmış sürümün üzerine kurmaya izin vermediği için bunlar bir kez kaldırılıp GitHub sürümü kurulmalıdır
   (önce Envanter → JSON dışa aktar; Amsler sonuçları → Yazdır / PDF). Kullanıcılar indirdikleri APK'yı sertifika
   parmak iziyle doğrulayabilir: `apksigner verify --print-certs LaserSafetyAnalysis-1.5.2.apk`.
2. **WebView motoru.** Tarayıcı motorunun güvenlik güncellemeleri "Android System WebView" / Chrome güncellemesiyle gelir;
   Play Store'dan güncel tutulmalıdır.
3. **Cihaz kilidi.** Ekran kilidi (PIN, desen) Android'in dosya şifrelemesini etkinleştirir. Root'lu ya da kilitsiz bir cihazda
   uygulamaya özel veriler okunabilir; bu her Android uygulaması için geçerlidir.
4. **Ekran görüntüsü.** Ekran görüntüsü engellenmiyor; Amsler sonucu "son uygulamalar" önizlemesinde görünebilir. İstenirse
   engellenebilir (o zaman ekran görüntüsü de alınamaz).
5. **Test cihazları.** `userdebug`/`eng` sistem görüntülerinde (emülatör gibi) WebView hata ayıklaması işletim sistemi tarafından
   bütün uygulamalar için açılır ([Chromium belgesi](https://chromium.googlesource.com/chromium/src/+show/refs/tags/142.0.7411.0/android_webview/docs/net-debugging.md)).
   Mağazadan alınan telefonlar `user` görüntüsüdür; dağıtım sürümünde kapalıdır.
6. **Veri kalıcılığı (güvenlik değil).** WebView yerel depoyu diske kısa bir gecikmeyle yazar. Ölçüm: kayıttan hemen sonra
   işlem öldürülürse son kayıt kayboluyor; 2 saniye sonra ya da uygulama arka plana alındıktan 1 saniye sonra kalıcı.
   Normal kullanımda etkisi yoktur.
7. **Telefon değişimi.** Veriler yeni telefona kendiliğinden taşınmaz (bilinçli seçim). Envanter için JSON dışa aktarın;
   Amsler sonuçlarını PDF olarak saklayın.
8. **Stil politikası** `'unsafe-inline'` içerir (satır içi stiller gerekli). Hiçbir dış kaynak yüklenemediği için CSS ile veri
   sızdırma mümkün değildir.
9. **Kod küçültme (R8) kapalı.** Kullanılmayan Kotlin sınıfları pakette durur; uygulama kodundan erişilemez ve ağ izni yoktur.

## PC sürümü

İnceleme 16.11.2026. PC sürümü, Android uygulamasının içine gömülen dosyanın aynısıdır; yukarıdaki web kodu bulguları
(XSS, CSV formülü, içe aktarma, İçerik Güvenlik Politikası) PC'de de geçerli ve düzeltilmiştir. Bu bölüm PC'ye özgü
yüzeyleri kapsar.

### Kapsam

| Bileşen | Ne yapar |
|---|---|
| `dist/LazerEmniyet.html` | Dağıtılan tek dosya; masaüstü kısayolu bunu varsayılan tarayıcıda (Firefox 160) `file://` ile açar |
| `index.html` | Kaynak (geliştirme) sürümü; `baslat.sh` ve `npm start` bunu açar |
| `tools/kisayol-kur.sh` | Uygulama menüsü ve masaüstü kısayolu (`.desktop`) kurar |
| `tools/build-single.js` | Tek dosyayı ve politikasını üretir |
| `tools/easyhaz_oracle.py` | Geliştirici aracı: EasyHaz çalışma kitabını LibreOffice ile çalıştırıp doğrulama verisi üretir |
| Klasör ve tarayıcı profili | Program dosyaları; Firefox'un yerel deposundaki envanter ve Amsler verisi |

### Tehdit modeli (PC)

| Saldırgan | Yol |
|---|---|
| Kötü niyetli JSON dosyası | Betik sokma, veri sızdırma, CSV formülü (web kodu; yukarıda) |
| İndirilmiş başka bir yerel HTML dosyası | Aynı tarayıcıda açılıp envanter verisini okumak ya da yerel dosyaları okumak |
| Bilgisayardaki başka bir yerel işlem ya da kullanıcı | Açık yerel portlar, yazılabilir program dosyaları, kısayol |
| Program dosyalarını değiştirebilen biri | Değiştirilmiş HTML/JS çalıştırmak |

### Bulgular ve düzeltmeler (PC)

| # | Bulgu | Önem | Düzeltme | Kanıt |
|---|---|---|---|---|
| P1 | EasyHaz doğrulama aracı LibreOffice'i **kimlik doğrulamasız bir TCP portunda** (127.0.0.1:2002) dinletiyordu ve iş bitince kapatmıyordu. Port açık kaldıkça bilgisayardaki her yerel işlem ve kullanıcı LibreOffice'i UNO üzerinden yönetip komut çalıştırabilirdi. | Orta (geliştirici aracı) | Araç LibreOffice'i kendisi başlatıyor: TCP yok, rastgele adlı ve yalnız bu kullanıcının bağlanabildiği boru (`/tmp/OSL_PIPE_1000_…`, `srwxrwxr-x`), geçici profil, iş bitince ya da hata olunca kesin kapatma. Makrolar yine asla çalışmaz, çalışma kitabı salt okunur. | test; 5 vakalık çalıştırma: çalışırken 2002 portu hiç açılmadı, LibreOffice kapandı, geçici profil silindi, sonuçlar kayıtlı değerlerle kayıtlı girdilerin hassasiyeti içinde aynı (en büyük göreli fark 2,6·10⁻⁵) |
| P2 | Kaynak sürüm (`index.html`) **İçerik Güvenlik Politikası olmadan** açılıyordu (tek dosyada vardı). | Düşük | `index.html`'e politika: yalnız kendi betik/stil dosyaları ve satır içi betiğin SHA-256 özeti; ağ, çerçeve, `eval` kapalı. Tek dosya derlemesi bunu kaldırıp kendi politikasını yazar (tek politika kalır). | test; Firefox'ta sıfır ihlal, saldırı denemeleri engellendi |
| P3 | Kısayol kurulum betiği klasör yolundaki **denetim karakterlerini** (satır sonu) reddetmiyordu: adında satır sonu olan bir klasörde `.desktop` dosyasına yeni satır (ör. ikinci bir `Exec=`) sızabilirdi. | Düşük | Denetim karakteri içeren yol reddedilir. | test: adı `Lazer\nExec=sh -c kotu` olan klasörde kurulum reddedildi, dosya yazılmadı |
| P4 | Üst klasör `EasyHazLSO2014 (v1.07)` ve içindeki EasyHaz dosyaları **herkese yazılabilir** (777; büyük olasılıkla Windows'tan kopyalanırken). Ev klasörünüz 750 olduğu için başka kullanıcılar şu an ulaşamıyor. | Bilgi | Sizin klasörünüz olduğu için değiştirilmedi. Önerilen: `chmod -R go-w ~/"EasyHazLSO2014 (v1.07)"` | `ls -la` |

### Kanıtlar (Firefox 160, `file://`)

- **Normal kullanım:** tek dosya ve kaynak sürüm, yeni politikalarıyla bütün akışlarda (örnek, rapor, yardım, Hakkında ve
  lisans, ayarlar, Amsler testi, envanter) **sıfır politika ihlaliyle** çalıştı; öz-denetim 64/64.
- **Politika denemesi** (her iki sürüm): satır içi olay işleyicisi, sonradan eklenen betik, metinden kod (zamanlayıcı dizgesi),
  `https` bağlantısı, `sendBeacon`, resimle veri sızdırma, çerçeve engellendi (`script-src-attr`, `script-src-elem`,
  `script-src`, `connect-src`, `img-src`, `frame-src` ihlalleri).
- **Kötü niyetli JSON:** içe aktarıldı, envanter, rapor ve Amsler açıldı: betik çalışmadı, tehlikeli öğe yok.
- **Yerel dosya okuma:** normal Firefox'ta `file://` sayfası `/etc/passwd`'u, komşu dosyayı ve alt klasördeki dosyayı
  okuyamıyor (NetworkError), politikalı da politikasız da. Not: Firefox otomasyon (WebDriver, uzaktan hata ayıklama)
  moduyla başlatılırsa bu kural gevşiyor; denetimde bu yüzden gerçek kullanımı ayrıca normal Firefox'la ölçtüm.
  Programı böyle bir oturumda kullanmayın.
- **Yerel depo ayrımı:** bir dosyanın yazdığı veriyi aynı klasördeki ya da başka klasördeki başka bir HTML dosyası okuyamıyor
  (`null`). İndirilmiş başka bir HTML dosyası envanter ve Amsler verisini göremez.
- **Dışa aktarma:** politika altında JSON, CSV ve HTML rapor sıfır ihlalle indirildi; CSV'de formül hücresi etkisiz
  (`'=HYPERLINK…`); kaydedilen HTML raporda politika var; dosya adındaki saldırı metni temizlenmiş
  (`rapor-_script_window___xss_3_script_.html`).
- **Kısayol:** `.desktop` dosyası `desktop-file-validate` ile geçerli; çalıştırdığı komut GIO ile çözümlendi
  (`xdg-open` + tek dosyanın tırnaklı tam yolu).

### Kalan riskler ve öneriler (PC)

1. **Tarayıcı.** Firefox 160'ta denendi (bu bilgisayarın varsayılanı). MDN'e göre `file:` sayfalarının yerel depo davranışı
   standartta tanımsızdır; güncel tarayıcılar her dosyayı ayrı tutar ama garanti yoktur. Chrome/Edge burada denenmedi.
   Programı Firefox'la açın.
2. **Durağan veri.** Envanter ve Amsler verisi Firefox profilinde (`~/.mozilla/firefox/…`) şifresiz durur; ev klasörü izinleri
   (750) korur. Sağlık verisi için disk şifrelemesi ve ekran kilidi önerilir. Dışa aktarılan JSON, CSV, PDF ve HTML dosyaları
   da kişisel veri içerir; gereksizleri silin.
3. **Program dosyalarının bütünlüğü.** Klasöre yazabilen biri programı değiştirebilir; açılış öz-denetimi yalnız hesap
   motorunu yakalar. Klasörü yalnız sizin yazabileceğiniz durumda tutun; tek dosyayı başkasına verirken güvenilir yoldan
   gönderin ve yukarıdaki SHA-256 değeriyle karşılaştırın: `sha256sum LazerEmniyet.html`.
4. **Ağ.** Android'deki gibi işletim sistemi engeli yok (tarayıcının ağı var); dış bağlantıyı sayfanın politikası
   (`connect-src 'none'`) ve kodda hiç ağ çağrısı olmaması engeller.
5. **Veri ayrımı (güvenlik değil).** Kısayol tek dosyayı, `baslat.sh` kaynak sürümü açar; Firefox ikisinin verisini ayrı tutar.
   Hep aynı dosyayı kullanın; taşımak için JSON dışa/içe aktarın.

## Yeniden doğrulama

```bash
node --test test/*.test.js
node tools/build-single.js
cd android && export JAVA_HOME=~/Downloads/android-studio/jbr
./gradlew --offline -Porg.gradle.java.installations.paths=$JAVA_HOME :app:assembleRelease
BT=~/Android/Sdk/build-tools/36.0.0
$BT/aapt2 dump permissions app/build/outputs/apk/release/app-release.apk
$BT/aapt2 dump xmltree --file AndroidManifest.xml app/build/outputs/apk/release/app-release.apk
$BT/apksigner verify --verbose --print-certs app/build/outputs/apk/release/app-release.apk
```

## Kaynaklar

- Android Developers — [Insecure WebView native bridges](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges)
- Android Developers — [StrandHogg attack / task affinity vulnerability](https://developer.android.com/privacy-and-security/risks/strandhogg)
- Android Developers — [Back up user data with Auto Backup](https://developer.android.com/identity/data/autobackup)
- Android Developers — [Debug using Chrome DevTools](https://developer.android.com/develop/ui/views/layout/webapps/debug-chrome-devtools)
- Chromium — [android_webview/docs/net-debugging.md](https://chromium.googlesource.com/chromium/src/+show/refs/tags/142.0.7411.0/android_webview/docs/net-debugging.md)
- OWASP — [Mobile Application Security Verification Standard (MASVS)](https://mas.owasp.org/MASVS/)
- OWASP — [CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection) · MITRE — [CWE-1236](https://cwe.mitre.org/data/definitions/1236.html)
- MDN — [Window: localStorage (file: URL davranışı)](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
