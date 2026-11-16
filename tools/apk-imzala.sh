#!/usr/bin/env bash
# Laser Safety Analysis — dağıtım APK'sını geliştiricinin dağıtım anahtarıyla imzalar.
# Copyright © 2026 S.OCAL — SPDX-License-Identifier: GPL-3.0-or-later
#
# Parola yalnız bu terminalde, apksigner tarafından sorulur; hiçbir dosyaya, ortam değişkenine ya da komut
# geçmişine yazılmaz. Anahtar deposu (.jks) bu klasörün DIŞINDA durmalı ve yedeklenmelidir: anahtar kaybolursa
# uygulama aynı adla güncellenemez.
#
#   cd android && ./gradlew --offline :app:assembleRelease      (imzasız APK)
#   tools/apk-imzala.sh [~/laser-safety-release.jks] [laser-safety]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KS="${1:-$HOME/laser-safety-release.jks}"
ALIAS="${2:-laser-safety}"
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
BT="$(ls -d "$SDK"/build-tools/*/ 2>/dev/null | sort -V | tail -1)"
REL="$ROOT/android/app/build/outputs/apk/release"
IN="$REL/app-release-unsigned.apk"
VER="$(sed -n "s/.*APP_VERSION = '\([0-9.]*\)'.*/\1/p" "$ROOT/js/ui/version.js")"
OUT="$REL/LaserSafetyAnalysis-$VER.apk"

[ -n "$BT" ] || { echo "Android build-tools bulunamadı ($SDK/build-tools)." >&2; exit 1; }
[ -f "$KS" ] || { echo "Anahtar deposu yok: $KS" >&2; exit 1; }
[ -f "$IN" ] || { echo "İmzasız APK yok. Önce: cd android && ./gradlew --offline :app:assembleRelease" >&2; exit 1; }

"$BT/zipalign" -c 4 "$IN" >/dev/null || { echo "APK hizalı değil (zipalign)." >&2; exit 1; }
rm -f "$OUT" "$OUT.idsig"
echo "Anahtar deposu: $KS  ·  takma ad: $ALIAS  ·  sürüm: $VER"
"$BT/apksigner" sign --ks "$KS" --ks-key-alias "$ALIAS" --out "$OUT" "$IN"
rm -f "$OUT.idsig"

V="$("$BT/apksigner" verify --verbose --print-certs "$OUT")"
if printf '%s\n' "$V" | grep -q "CN=Android Debug"; then
  rm -f "$OUT"
  echo "Bu, Android'in hata ayıklama anahtarı; dağıtım için kullanılmaz. APK silindi." >&2
  exit 1
fi
printf '%s\n' "$V" | grep -E "Verified using v[23] |certificate DN|certificate SHA-256"
sha256sum "$OUT"
echo "İmzalandı: $OUT"
