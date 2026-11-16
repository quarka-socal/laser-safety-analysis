#!/usr/bin/env bash
# Lazer Emniyet Analizi'ni varsayılan tarayıcıda açar (çevrimdışı çalışır).
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec xdg-open "$DIR/index.html"
