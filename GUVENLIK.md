# Güvenlik değerlendirmesi — Laser Safety Analysis 1.5.2

| | |
|---|---|
| Tarih | 16.11.2026 |
| Uygulama | 1.5.2 (Android versionCode 10502), hesap motoru 1.3.1 |
| Dağıtım APK'sı | `android/app/build/outputs/apk/release/app-release.apk`, 2 266 680 bayt |
| APK SHA-256 | `165e706691dae152a10bcb9e79cf773c542eba9d5cf505c571e1ec5fe774eb94` |
| İmza sertifikası SHA-256 | `09014ea88483b89050e6a622fd596a93350806323ba794db1588340b1ed4ea00` |
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
| 1 | Dağıtılan APK **debug derlemesiydi** (`debuggable=true`): USB hata ayıklaması açık bir cihazda `run-as` ile uygulama verisi okunabilir, WebView uzaktan hata ayıklanabilirdi. | Orta | Dağıtım (release) derlemesi. Kurulu sürümle aynı anahtarla imzalı, telefondaki sürümün üzerine kurulur, veriler korunur. | `pkgFlags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ]` (DEBUGGABLE yok); `run-as: package not debuggable`; test |
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

1. **İmza anahtarı.** APK bu bilgisayarın Android debug anahtarıyla imzalı (`~/.android/debug.keystore`). Kişisel ve kurum içi
   kullanım için yeterlidir; ancak bu dosyaya erişen biri aynı uygulama için güncelleme imzalayabilir, dosya bu bilgisayarın
   dışına çıkmamalıdır. Geniş dağıtım için ayrı, parolalı bir dağıtım anahtarı önerilir. Anahtar değişince telefonda uygulama
   kaldırılıp yeniden kurulmalıdır (önce Envanter → JSON dışa aktar). Parolayı sizin belirlemeniz gerekir.
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
