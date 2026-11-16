/*
 * Lazer Emniyet — uygulama (arayüz) sürümü. Hesap motorunun sürümü ayrıdır:
 * js/core/analysis.js → ENGINE_VERSION. Android sürüm numarası bu dosyadan türetilir.
 * Copyright © 2026 S.ÖCAL — SPDX-License-Identifier: GPL-3.0-or-later
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});
  LE.APP_VERSION = '1.5.0';
  LE.APP_DATE = '2026-11-16'; // sürüm tarihi
  LE.BUILD_TIME = /*BUILD_TIME*/ null; // tek dosya derlemesinde tools/build-single.js yazar
  LE.APP_AUTHOR = 'S.ÖCAL';
  LE.APP_LICENSE = 'GPL-3.0-or-later';
})(typeof globalThis !== 'undefined' ? globalThis : this);
