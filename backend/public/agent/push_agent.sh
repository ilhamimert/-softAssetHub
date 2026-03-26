#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# İSOFT AssetHub — Monitoring Push Agent
# Cihazlarda çalışarak CPU/RAM/disk/sıcaklık verisini
# her 30 saniyede bir backend'e POST eder.
#
# Kullanım:
#   export ASSET_TOKEN="<jwt-veya-api-key>"
#   export API_URL="https://example.com/api/v1/monitoring"
#   export ASSET_ID="42"
#   bash push_agent.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ──────────────────────────────────────────────
INTERVAL=${PUSH_INTERVAL:-30}           # saniye
API_URL="${API_URL:-http://localhost:5000/api/v1/monitoring}"
ASSET_ID="${ASSET_ID:?ASSET_ID env variable gerekli}"
ASSET_TOKEN="${ASSET_TOKEN:?ASSET_TOKEN env variable gerekli}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ── Metric toplayıcılar ────────────────────────────────
get_cpu() {
  if command -v mpstat &>/dev/null; then
    mpstat 1 1 | awk '/Average/ && $NF ~ /[0-9]/ { printf "%.1f", 100 - $NF }'
  elif [ -f /proc/stat ]; then
    # /proc/stat'tan basit hesaplama
    read -r cpu user nice system idle rest < /proc/stat
    local total=$((user + nice + system + idle))
    if [ "$total" -gt 0 ]; then
      echo "scale=1; ($user + $nice + $system) * 100 / $total" | bc
    else
      echo "0"
    fi
  else
    echo "0"
  fi
}

get_ram() {
  if command -v free &>/dev/null; then
    free | awk '/^Mem:/ { printf "%.1f", ($3/$2)*100 }'
  else
    echo "0"
  fi
}

get_ram_gb() {
  if command -v free &>/dev/null; then
    free -g | awk '/^Mem:/ { print $3, $2 }'
  else
    echo "0 0"
  fi
}

get_disk() {
  df / | awk 'NR==2 { gsub(/%/,"",$5); print $5 }'
}

get_temp() {
  # Linux thermal zone
  if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    awk '{ printf "%.1f", $1/1000 }' /sys/class/thermal/thermal_zone0/temp
    return
  fi
  # lm-sensors
  if command -v sensors &>/dev/null; then
    sensors 2>/dev/null | awk '/^Core 0/ { gsub(/[+°C]/,"",$3); print $3; exit }'
    return
  fi
  echo "null"
}

get_uptime_seconds() {
  if [ -f /proc/uptime ]; then
    awk '{ printf "%d", $1 }' /proc/uptime
  else
    echo "0"
  fi
}

# ── Ana döngü ──────────────────────────────────────────
log "Push Agent başlatıldı — AssetID=$ASSET_ID, Interval=${INTERVAL}s"
log "Endpoint: ${API_URL}/${ASSET_ID}"

while true; do
  CPU=$(get_cpu)
  RAM=$(get_ram)
  DISK=$(get_disk)
  TEMP=$(get_temp)
  UPTIME=$(get_uptime_seconds)

  RAM_GB=($(get_ram_gb))
  MEM_USED=${RAM_GB[0]:-0}
  MEM_TOTAL=${RAM_GB[1]:-0}

  # JSON payload
  PAYLOAD=$(cat <<EOF
{
  "cpuUsage": ${CPU:-0},
  "ramUsage": ${RAM:-0},
  "diskUsage": ${DISK:-0},
  "temperature": ${TEMP},
  "memoryUsedGb": ${MEM_USED},
  "memoryTotalGb": ${MEM_TOTAL},
  "uptime": ${UPTIME},
  "isOnline": true
}
EOF
)

  # POST
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${API_URL}/${ASSET_ID}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ASSET_TOKEN}" \
    -d "${PAYLOAD}" \
    --connect-timeout 10 \
    --max-time 15 \
  ) || HTTP_CODE="000"

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    log "✓ POST OK (${HTTP_CODE}) — CPU=${CPU}% RAM=${RAM}% Disk=${DISK}% Temp=${TEMP}°C"
  else
    log "✗ POST FAILED (${HTTP_CODE}) — yeniden denenecek..."
  fi

  sleep "$INTERVAL"
done
