param(
  [int]$Port = 5310
)

Write-Host "Releasing port $Port..."
try {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
} catch {
  $connections = @()
}

if (!$connections -or $connections.Count -eq 0) {
  Write-Host "No process is listening on port $Port."
  exit 0
}

foreach ($conn in $connections) {
  $procId = $conn.OwningProcess
  if ($procId) {
    try {
      $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
      if ($p) {
        Write-Host "Killing PID $procId ($($p.ProcessName))"
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      }
    } catch {}
  }
}

Start-Sleep -Seconds 1
Write-Host "Port $Port should be free now."
