/*
 * Lazer Emniyet — örnek lazerler (tipik katalog değerleri; gerçek cihazınızın
 * verileriyle değiştirin)
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});

  const EX = [
    {
      title: 'He-Ne 632,8 nm, 1 mW', desc: 'Hizalama / eğitim lazeri (tipik Sınıf 2)',
      v: { name: 'He-Ne hizalama lazeri', cls: '2', wl: '632.8', mode: 'cw', P: '1', spec: '1/e2', dx: '0.8', phix: '1' }, u: { P: 'mW' },
    },
    {
      title: 'Mavi diyot 450 nm, 5 W', desc: 'Gravür modülü, asimetrik ışın',
      v: { name: 'Mavi diyot gravür lazeri', cls: '4', wl: '450', mode: 'cw', P: '5', spec: '1/e2', ellip: true, dx: '4', phix: '1.5', dy: '1.5', phiy: '4' },
    },
    {
      title: 'Yeşil DPSS 532 nm, 1 W', desc: 'Laboratuvar sürekli dalga lazeri',
      v: { name: 'DPSS 532 nm', cls: '4', wl: '532', mode: 'cw', P: '1', spec: '1/e2', dx: '2', phix: '1', range: '5' },
    },
    {
      title: 'Nd:YAG 1064 nm, 20 W markalama', desc: 'Q-anahtarlı, 1 mJ, 100 ns, 20 kHz',
      v: { name: 'Q-anahtarlı Nd:YAG markalama', cls: '4', wl: '1064', mode: 'rp', rp_kind: 'Q', Q: '1', tau: '100', f: '20', spec: '1/e2', dx: '7', phix: '1.5' },
      u: { Q: 'mJ', tau: 'ns', f: 'kHz' },
    },
    {
      title: 'Nd:YAG 532 nm, 10 Hz araştırma', desc: '0,4 J, 5 ns darbeler, ikinci harmonik',
      v: { name: 'Q-anahtarlı Nd:YAG (2ω)', cls: '4', wl: '532', mode: 'rp', rp_kind: 'Q', Q: '400', tau: '5', f: '10', spec: '1/e2', dx: '7', phix: '0.6', range: '10' },
      u: { Q: 'mJ', tau: 'ns', f: 'Hz' },
    },
    {
      title: 'Ti:Safir 800 nm, 100 fs', desc: '80 MHz osilatör, 1 W ortalama',
      v: { name: 'Ti:Safir femtosaniye osilatör', cls: '4', wl: '800', mode: 'rp', rp_kind: 'P', Pavg: '1', tau: '100', f: '80', spec: '1/e2', dx: '2', phix: '1', oav: false },
      u: { Pavg: 'W', tau: 'fs', f: 'MHz' },
    },
    {
      title: 'Fiber lazer 1070 nm, 1 kW + mercek', desc: 'Kesim kafası, f = 150 mm, mercekte 10 mm',
      v: { name: 'Fiber kesim lazeri', cls: '4', wl: '1070', mode: 'cw', P: '1', spec: '1/e2', dx: '10', phix: '2', lens_on: true, lens_f: '150', lens_b: '10', lens_r: '1', rho: '20' },
      u: { P: 'kW' },
    },
    {
      title: 'CO₂ 10,6 µm, 2 kW kesim', desc: 'Tipik büyük ışın çaplı CO₂ kesici',
      v: { name: 'CO₂ kesim lazeri', cls: '4', wl: '10.6', mode: 'cw', P: '2', spec: '1/e2', dx: '18', phix: '1.5' },
      u: { wl: 'µm', P: 'kW' },
    },
    {
      title: 'Er:YAG 2940 nm, medikal', desc: '1 J, 250 µs, 10 Hz',
      v: { name: 'Er:YAG medikal lazer', cls: '4', wl: '2940', mode: 'rp', rp_kind: 'Q', Q: '1', tau: '250', f: '10', spec: '1/e2', dx: '3', phix: '5' },
      u: { Q: 'J', tau: 'µs', f: 'Hz' },
    },
    {
      title: 'UV DPSS 355 nm, 5 W', desc: '30 kHz, 20 ns; UV için 30 000 s standart süre',
      v: { name: 'UV DPSS 355 nm', cls: '4', wl: '355', mode: 'rp', rp_kind: 'P', Pavg: '5', tau: '20', f: '30', spec: '1/e2', dx: '1', phix: '1' },
      u: { Pavg: 'W', tau: 'ns', f: 'kHz' },
    },
    {
      title: 'Telekom 1550 nm, 100 mW fiber', desc: 'Tek modlu fiber ucu (MFD 10,4 µm)',
      v: { name: 'Fiber amplifikatör çıkışı', cls: '3B', wl: '1550', mode: 'cw', P: '100', spec: '1/e2', dx: '1', phix: '1', fiber: 'single', fiber_MFD: '10.4', fiber_r: '0.1' },
      u: { P: 'mW' },
    },
    {
      title: 'KrF eksimer 248 nm', desc: '0,5 J, 20 ns, 50 Hz, 10×25 mm düz tepe',
      v: { name: 'KrF eksimer lazer', cls: '4', wl: '248', mode: 'rp', rp_kind: 'Q', Q: '500', tau: '20', f: '50', spec: '1/e', profile: 'tophat-rect', ellip: true, dx: '25', phix: '2', dy: '10', phiy: '1' },
      u: { Q: 'mJ', tau: 'ns', f: 'Hz' },
    },
  ];

  LE.examples = EX;
})(typeof globalThis !== 'undefined' ? globalThis : this);
