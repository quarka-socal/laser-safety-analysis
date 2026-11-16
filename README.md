# Laser Safety Analysis · Lazer Emniyet Analizi

Lazer hasar analizi için çevrimdışı kullanılabilen Android uygulaması ve tek dosyalık PC sürümü. Android uygulaması ve tek dosyalık PC sürümü birebir aynıdır.
**MPE**, **NOHD / ENOHD**, **optik yoğunluk (OD)**, **EN 207 / EN 208** hesaplarını yapar.
Lazer emniyet gözlüğü seçimi, deri korumasının belirlenmesi ve lazer kaynaklı göz hasarının ilk tespitine yönelik **Amsler Grid testi** için laboratuvar ve sahada kullanılabilir.


> Sonuçlar girilen verilere dayanır ve yetkin bir lazer güvenlik sorumlusunun değerlendirmesinin yerine geçmez.

## İndir

[Sürümler (Releases)](../../releases) sayfasından:

- **Android** (Android 11 ve üstü): `LaserSafetyAnalysis-<sürüm>.apk`. Dosyayı telefonda açıp kurun; telefon bir kez
  "bilinmeyen kaynaklardan yükleme" izni ister.
- **PC** (Windows, Linux, macOS): `LaserSafetyAnalysis-<sürüm>.html`. Firefox ile açın; kurulum ve internet gerekmez.
  Linux'ta uygulama menüsü ve masaüstü kısayolu için kaynak koddaki `tools/kisayol-kur.sh`.
- `SHA256SUMS.txt`: dosyaların bütünlüğünü `sha256sum -c SHA256SUMS.txt` ile doğrulayabilirsiniz.
- APK imza sertifikası: `CN=S.OCAL, O=Laser Safety Analysis`, SHA-256
  `e8c9cbff9fd9026be0522150d81a7f0a21884c2d431b88c9816b5cf23687dda0` (`apksigner verify --print-certs` ile denetlenir).
  Bundan önce elle dağıtılan geliştirme sürümleri farklı anahtarla imzalıdır: önce kaldırıp sonra kurun (envanteri JSON
  olarak dışa aktarmayı unutmayın).

## Özellikler

- Sınır değerler: ICNIRP 2013 (IEC 60825-1:2014 Ek A ve ANSI Z136.1-2014 ile uyumlu) ve 2006/25/AT Ek II; varsayılan olarak
  en koruyucusu belirler
- Sürekli, tek darbe ve tekrarlı darbe; Kural 1–3 ve C_P; dürbünle bakış (ENOHD), atmosferik zayıflama, türbülans payı
- EN 207 / EN 208 işaretlemesi, mesafe–OD grafiği, yazdırılabilir rapor (PDF), lazer envanteri (JSON, CSV)
- Amsler Grid testi: gerçek 5 mm kareler (30 cm'den ≈ 1°), iki göz, belirtiler, test geçmişi, A4 rapor, kâğıt ızgara
- Türkçe / English, açık ve koyu tema
- Her açılışta 64 vektörlük öz-denetim; EasyHaz LSO 2014 ile çapraz doğrulama (ayrıntılar [OKUBENI.md](OKUBENI.md))

## Güvenlik ve gizlilik

- Android uygulaması hiçbir izin istemez: internet bağlantısı yoktur, veriler yalnız cihazda kalır, bulut yedeği ve cihaz
  aktarımı kapalıdır.
- Harici kütüphane, analitik ya da reklam yoktur. Sayfada İçerik Güvenlik Politikası (CSP) yalnız gömülü betiklere izin verir.
- Siber güvenlik değerlendirmesi, saldırı denemeleri ve kalan riskler: [GUVENLIK.md](GUVENLIK.md)

## Kaynak koddan

```bash
node --test test/*.test.js       # testler (Node 18 ve üstü)
node tools/build-single.js       # tek dosya: dist/LazerEmniyet.html
```

Android derlemesi, imzalama ve doğrulama: [OKUBENI.md](OKUBENI.md) → "Android sürümü".

## Lisans

GNU Genel Kamu Lisansı sürüm 3 ya da sonrası ([LICENSE](LICENSE)). Copyright © 2026 S.OCAL

---

## English

Offline laser hazard analysis (MPE, NOHD/ENOHD, optical density, EN 207 / EN 208 eyewear, diffuse reflection, skin, lens and
fibre hazards) and an Amsler grid test for a quick first eye check in the field. Exposure limits follow ICNIRP 2013
(IEC 60825-1:2014 Annex A) and Directive 2006/25/EC; the more protective set applies by default.

- **Android** (11+): the app requests no permissions and has no network access; data stay on the device.
- **PC**: a single HTML file that runs offline in any modern browser (Firefox recommended).
- Turkish and English user interface. Downloads are on the [Releases](../../releases) page.
- APK signing certificate SHA-256: `e8c9cbff9fd9026be0522150d81a7f0a21884c2d431b88c9816b5cf23687dda0` (CN=S.OCAL).
- Security assessment: [GUVENLIK.md](GUVENLIK.md) (Turkish).

Results depend on the data entered and do not replace the assessment of a competent laser safety officer.
Licence: GPL-3.0-or-later. Developer: S.OCAL.
