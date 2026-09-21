#!/bin/bash
cd ~/Desktop/IOMASTAVKA_FILE_28
MSG="${1:-auto update $(date +%H:%M)}"
echo "📤 Deploying: $MSG"
git add .
git commit -m "$MSG" 2>/dev/null || echo "(no changes)"
git push origin main:v138-clean --force
echo "✅ Запушено. Render обновится через 2 минуты."
echo "🔗 https://iomastavki.onrender.com"
