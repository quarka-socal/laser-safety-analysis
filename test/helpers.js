'use strict';
// Hesap motorunu tarayıcıdaki sırayla yükler (dosyalar globalThis.LE'ye bağlanır).
const path = require('path');
const CORE = path.join(__dirname, '..', 'js', 'core');
for (const m of ['units', 'mpe', 'mpe_aord', 'beam', 'eyewear', 'analysis', 'selftest']) {
  require(path.join(CORE, m + '.js'));
}
const LE = globalThis.LE;

/** Göreli yakınlık. */
function near(actual, expected, rel, msg) {
  const ok = Math.abs(actual - expected) <= rel * Math.abs(expected);
  if (!ok) {
    throw new Error((msg ? msg + ': ' : '') + 'beklenen ' + expected + ', bulunan ' + actual + ' (göreli tolerans ' + rel + ')');
  }
}

/** Basit dairesel Gauss ışın girişi (1/e çap ve ıraksama). */
function gauss(dm, phiRad) {
  return { profile: 'gauss', dx: dm, dy: dm, phix: phiRad, phiy: phiRad };
}

module.exports = { LE, near, gauss };
