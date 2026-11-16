'use strict';
/*
 * Form okuma: içe aktarılan / eski oturumdan gelen bozuk durum istisna atmamalı,
 * alan hatası olarak gösterilmeli ve hesap yapılmamalı (ekranda eski sonuç kalmamalı).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { LE } = require('./helpers');
require(path.join(__dirname, '..', 'js', 'ui', 'form.js'));
const F = LE.form;

test('varsayılan form geçerli ve hesaplanabilir', () => {
  F.setState(F.defaultState());
  const r = F.read();
  assert.equal(r.ok, true);
  assert.equal(LE.analysis.analyze(r.inp).ok, true);
});

test('bilinmeyen birim: istisna yok, alan hatası, hesap yapılmaz', () => {
  F.setState({ v: { wl: '1064', P: '50' }, u: { wl: 'xyz' } });
  let r;
  assert.doesNotThrow(() => { r = F.read(); });
  assert.equal(r.ok, false);
  assert.match(r.errs.wl, /birim/i);
  // listede olmayan ama tabloda bulunan birim de kabul edilmez (seçim kutusunda görünmez)
  F.setState({ v: { mode: 'cw', T_auto: false, T: '5' }, u: { T: 'µs' } });
  r = F.read();
  assert.equal(r.ok, false);
  assert.match(r.errs.T, /birim/i);
});

test('geçersiz seçim değeri sessizce yorumlanmaz', () => {
  for (const [id, bad] of [['spec', '1/e3'], ['profile', 'kare'], ['model', 'x'], ['limits', 'abc'], ['mode', 'pulse']]) {
    F.setState({ v: { [id]: bad } });
    let r;
    assert.doesNotThrow(() => { r = F.read(); }, id);
    assert.equal(r.ok, false, id + ' geçersizken hesap yapılmamalı');
    assert.ok(r.errs[id], id + ' için hata mesajı');
  }
});

test('onay kutusu değerleri boolean\'a çevrilir ("false" metni açık sayılmaz)', () => {
  F.setState({ v: { T_auto: 'false', T: '2', mode: 'cw' } });
  assert.equal(F.get('T_auto'), false);
  const r = F.read();
  assert.equal(r.ok, true);
  assert.equal(r.inp.T, 2);
  F.setState(F.defaultState());
});
