# ─────────────────────────────────────────────────────────────
# İSOFT AssetHub — Monitoring Push Agent (Windows)
# CPU/RAM/disk/sıcaklık verisini her 30 saniyede bir POST eder.
#
# Kullanım:
#   $env:AGENT_SECRET = "your-agent-secret-here"
#   $env:API_URL      = "https://example.com/api/v1/monitoring"
#   $env:ASSET_ID     = "42"
#   .\push_agent.ps1
# ─────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

$Interval   = if ($env:PUSH_INTERVAL) { [int]$env:PUSH_INTERVAL } else { 30 }
$ApiUrl     = if ($env:API_URL)       { $env:API_URL } else { "http://localhost:5000/api/v1/monitoring" }
$AssetId    = if ($env:ASSET_ID)      { $env:ASSET_ID } else { throw "ASSET_ID env variable gerekli" }
$AgentSecret = if ($env:AGENT_SECRET) { $env:AGENT_SECRET } else { throw "AGENT_SECRET env variable gerekli" }

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$ts] $msg"
}

function Get-CpuUsage {
    try {
        $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
        return [math]::Round($cpu.Average, 1)
    } catch { return 0 }
}

function Get-RamUsage {
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $used = $os.TotalVisibleMemorySize - $os.FreePhysicalMemory
        return [math]::Round(($used / $os.TotalVisibleMemorySize) * 100, 1)
    } catch { return 0 }
}

function Get-RamGB {
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $usedGB  = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 1)
        $totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
        return @{ Used = $usedGB; Total = $totalGB }
    } catch { return @{ Used = 0; Total = 0 } }
}

function Get-DiskUsage {
    try {
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
        return [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1)
    } catch { return 0 }
}

function Get-Temperature {
    try {
        $temps = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue
        if ($temps) {
            $kelvin = ($temps | Measure-Object -Property CurrentTemperature -Average).Average
            return [math]::Round($kelvin / 10 - 273.15, 1)
        }
    } catch {}
    return $null
}

function Get-UptimeSeconds {
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $uptime = (Get-Date) - $os.LastBootUpTime
        return [int]$uptime.TotalSeconds
    } catch { return 0 }
}

Write-Log "Push Agent başlatıldı — AssetID=$AssetId, Interval=${Interval}s"
Write-Log "Endpoint: $ApiUrl/$AssetId"

while ($true) {
    $cpu    = Get-CpuUsage
    $ram    = Get-RamUsage
    $ramGB  = Get-RamGB
    $disk   = Get-DiskUsage
    $temp   = Get-Temperature
    $uptime = Get-UptimeSeconds

    $tempValue = if ($null -ne $temp) { $temp } else { "null" }

    $payload = @{
        cpuUsage      = $cpu
        ramUsage      = $ram
        diskUsage     = $disk
        temperature   = $temp
        memoryUsedGB  = $ramGB.Used
        memoryTotalGB = $ramGB.Total
        uptime        = $uptime
        isOnline      = $true
    } | ConvertTo-Json

    try {
        $headers = @{
            "Content-Type" = "application/json"
            "X-Agent-Key"  = $AgentSecret
        }
        $response = Invoke-WebRequest -Uri "$ApiUrl/$AssetId" -Method POST `
            -Headers $headers -Body $payload -TimeoutSec 15
        Write-Log "OK ($($response.StatusCode)) — CPU=${cpu}% RAM=${ram}% Disk=${disk}% Temp=${tempValue}C"
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        Write-Log "FAILED ($code) — $($_.Exception.Message)"
    }

    Start-Sleep -Seconds $Interval
}
