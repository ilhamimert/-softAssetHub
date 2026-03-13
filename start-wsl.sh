#!/bin/bash
# AssetHub WSL Dev Starter

echo "=== AssetHub Başlatılıyor ==="

# PostgreSQL başlat
sudo service postgresql start
echo "[OK] PostgreSQL"

# Backend başlat (arka planda)
cd ~/assethub/backend
node --max-old-space-size=4096 server.js &
BACKEND_PID=$!
echo "[OK] Backend PID: $BACKEND_PID (port 5000)"

# Frontend başlat (arka planda)
cd ~/assethub/frontend
npm run dev &
FRONTEND_PID=$!
echo "[OK] Frontend PID: $FRONTEND_PID (port 3000)"

echo ""
echo "=== Hazır ==="
echo "  http://localhost:3000"
echo ""
echo "Durdurmak için: kill $BACKEND_PID $FRONTEND_PID"
echo "veya: pkill -f 'node server.js' && pkill -f 'vite'"

# Logları göster
wait
