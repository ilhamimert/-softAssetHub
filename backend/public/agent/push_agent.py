#!/usr/bin/env python3
"""
İSOFT AssetHub — Monitoring Push Agent (Python)
Cihazlarda çalışarak CPU/RAM/disk/sıcaklık verisini
her 30 saniyede bir backend'e POST eder.

Kurulum:
    pip install psutil requests

Kullanım:
    export ASSET_TOKEN="<jwt-veya-api-key>"
    export API_URL="http://localhost:5000/api/v1/monitoring"
    export ASSET_ID="42"
    python push_agent.py
"""

import os
import sys
import time
import json
import logging
from datetime import datetime

try:
    import psutil
except ImportError:
    print("psutil kurulu değil: pip install psutil")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("requests kurulu değil: pip install requests")
    sys.exit(1)

# ── Config ──────────────────────────────────────────────
ASSET_ID = os.environ.get("ASSET_ID")
ASSET_TOKEN = os.environ.get("ASSET_TOKEN")
API_URL = os.environ.get("API_URL", "http://localhost:5000/api/v1/monitoring")
INTERVAL = int(os.environ.get("PUSH_INTERVAL", "30"))

if not ASSET_ID:
    print("HATA: ASSET_ID env variable gerekli")
    sys.exit(1)
if not ASSET_TOKEN:
    print("HATA: ASSET_TOKEN env variable gerekli")
    sys.exit(1)

ENDPOINT = f"{API_URL}/{ASSET_ID}"

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("push_agent")


def get_temperature():
    """CPU sıcaklığını al (Linux/macOS)"""
    try:
        temps = psutil.sensors_temperatures()
        if not temps:
            return None
        # coretemp veya ilk bulunan sensör
        for name in ["coretemp", "cpu_thermal", "k10temp", "acpitz"]:
            if name in temps:
                readings = temps[name]
                if readings:
                    return round(readings[0].current, 1)
        # Herhangi bir sensör
        first_key = list(temps.keys())[0]
        if temps[first_key]:
            return round(temps[first_key][0].current, 1)
    except Exception:
        pass
    return None


def collect_metrics():
    """Sistem metriklerini topla"""
    cpu = psutil.cpu_percent(interval=1)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    temp = get_temperature()
    boot_time = psutil.boot_time()
    uptime_seconds = int(time.time() - boot_time)

    # GPU kullanımı (opsiyonel)
    gpu_usage = None
    try:
        import subprocess
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            gpu_usage = float(result.stdout.strip().split("\n")[0])
    except Exception:
        pass

    # Network
    net = psutil.net_io_counters()

    payload = {
        "cpuUsage": round(cpu, 1),
        "ramUsage": round(mem.percent, 1),
        "diskUsage": round(disk.percent, 1),
        "memoryUsedGb": round(mem.used / (1024**3), 2),
        "memoryTotalGb": round(mem.total / (1024**3), 2),
        "uptime": uptime_seconds,
        "isOnline": True,
    }

    if temp is not None:
        payload["temperature"] = temp
    if gpu_usage is not None:
        payload["gpuUsage"] = round(gpu_usage, 1)

    # Network (Mbps cinsinden anlık - basit hesaplama)
    payload["networkInMbps"] = round(net.bytes_recv / (1024 * 1024), 2)
    payload["networkOutMbps"] = round(net.bytes_sent / (1024 * 1024), 2)

    return payload


def main():
    log.info(f"Push Agent başlatıldı — AssetID={ASSET_ID}, Interval={INTERVAL}s")
    log.info(f"Endpoint: {ENDPOINT}")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ASSET_TOKEN}",
    }

    consecutive_failures = 0
    max_backoff = 300  # 5 dakika

    while True:
        try:
            payload = collect_metrics()

            response = requests.post(
                ENDPOINT,
                json=payload,
                headers=headers,
                timeout=15,
            )

            if response.status_code in (200, 201):
                log.info(
                    f"✓ POST OK ({response.status_code}) — "
                    f"CPU={payload['cpuUsage']}% "
                    f"RAM={payload['ramUsage']}% "
                    f"Disk={payload['diskUsage']}% "
                    f"Temp={payload.get('temperature', 'N/A')}°C"
                )
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                log.warning(
                    f"✗ POST FAILED ({response.status_code}) — "
                    f"{response.text[:200]}"
                )

        except requests.exceptions.ConnectionError:
            consecutive_failures += 1
            log.error("✗ Bağlantı hatası — sunucu erişilemez")
        except requests.exceptions.Timeout:
            consecutive_failures += 1
            log.error("✗ Zaman aşımı — sunucu yanıt vermedi")
        except Exception as e:
            consecutive_failures += 1
            log.error(f"✗ Beklenmeyen hata: {e}")

        # Exponential backoff on failure
        if consecutive_failures > 3:
            backoff = min(INTERVAL * (2 ** (consecutive_failures - 3)), max_backoff)
            log.warning(f"  Backoff: {backoff}s bekleniyor ({consecutive_failures} ardışık hata)")
            time.sleep(backoff)
        else:
            time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
