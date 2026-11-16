#!/usr/bin/env bash
# Laser Safety Analysis — Linux masaüstü kısayolu (Cinnamon, GNOME, KDE, XFCE…)
# Copyright © 2026 S.OCAL — SPDX-License-Identifier: GPL-3.0-or-later
#
# Uygulama menüsüne ve masaüstüne "Laser Safety Analysis" simgesi ekler. Tıklanınca tek dosya sürümü
# (dist/LazerEmniyet.html) varsayılan tarayıcıda, çevrimdışı açılır. Yeniden çalıştırmak güvenlidir.
#
#   tools/kisayol-kur.sh            kur (klasör taşındıysa yeniden çalıştırın)
#   tools/kisayol-kur.sh --kaldir   kaldır
#
# Not: Firefox, file:// sayfalarının yerel deposunu (envanter, ayarlar, Amsler geçmişi) dosya yoluna göre
# ayrı tutar. Klasör taşınırsa ya da program index.html ile açılırsa önceki kayıtlar görünmez: eski yerde
# Envanter → JSON dışa aktar, yeni yerde JSON içe aktar.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ID=laser-safety-analysis
HTML="$ROOT/dist/LazerEmniyet.html"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
APPS="$DATA/applications"
ICONS="$DATA/icons/hicolor/scalable/apps"
DESK="${KISAYOL_MASAUSTU:-$(xdg-user-dir DESKTOP 2>/dev/null || true)}"
[ -n "$DESK" ] || DESK="$HOME/Desktop"

if [ "${1:-}" = "--kaldir" ]; then
  rm -f "$APPS/$ID.desktop" "$ICONS/$ID.svg" "$DESK/$ID.desktop"
  if command -v update-desktop-database >/dev/null; then update-desktop-database "$APPS" >/dev/null 2>&1 || true; fi
  echo "Kısayol kaldırıldı."
  exit 0
fi

if [ ! -f "$HTML" ]; then
  echo "Bulunamadı: $HTML (önce: node tools/build-single.js)" >&2
  exit 1
fi
# Exec satırında tırnak içinde bu karakterler kaçış ister; satır sonu gibi denetim karakterleri .desktop dosyasına
# yeni satır (yeni anahtar) sokabilir: klasör yolunda bunlar olmamalı
case "$HTML" in
  *[\"\`\$\\]*) echo "Klasör yolunda \" \` \$ \\ karakterleri olmamalı: $HTML" >&2; exit 1 ;;
  *[[:cntrl:]]*) echo "Klasör yolunda denetim karakteri (satır sonu, sekme vb.) olmamalı." >&2; exit 1 ;;
esac

mkdir -p "$APPS" "$ICONS"
cp "$ROOT/tools/$ID.svg" "$ICONS/$ID.svg"

{
  echo "[Desktop Entry]"
  echo "Type=Application"
  echo "Version=1.0"
  echo "Name=Laser Safety Analysis"
  echo "GenericName=Laser hazard analysis"
  echo "GenericName[tr]=Lazer tehlike analizi"
  echo "Comment=MPE, NOHD, OD, EN 207/208 eyewear and Amsler grid test (offline)"
  echo "Comment[tr]=MPE, NOHD, OD, EN 207/208 göz koruyucu ve Amsler Grid testi (çevrimdışı)"
  echo "Exec=xdg-open \"${HTML//%/%%}\""
  echo "Icon=$ICONS/$ID.svg"
  echo "Terminal=false"
  echo "Categories=Science;Engineering;"
  echo "Keywords=laser;lazer;MPE;NOHD;OD;EN 207;Amsler;safety;emniyet;"
} > "$APPS/$ID.desktop"
chmod 755 "$APPS/$ID.desktop"
if command -v update-desktop-database >/dev/null; then update-desktop-database "$APPS" >/dev/null 2>&1 || true; fi

if [ -d "$DESK" ]; then
  install -m 755 "$APPS/$ID.desktop" "$DESK/$ID.desktop"
  # GNOME masaüstü simgeleri "güvenilir" işareti ister; Cinnamon/Nemo için çalıştırılabilir olması yeter
  if [ "${KISAYOL_GIO:-1}" = 1 ] && command -v gio >/dev/null; then
    gio set "$DESK/$ID.desktop" metadata::trusted true >/dev/null 2>&1 || true
  fi
  echo "Kuruldu: uygulama menüsü ve masaüstü ($DESK) — Laser Safety Analysis"
else
  echo "Kuruldu: uygulama menüsü — Laser Safety Analysis (masaüstü klasörü bulunamadı: $DESK)"
fi
