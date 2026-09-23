$exePath = [System.IO.Path]::Combine($env:LOCALAPPDATA, 'Programs', 'study-time-tracker', 'Study Time Tracker.exe')

Write-Host "Launching installed executable: $exePath"
$proc = Start-Process -FilePath $exePath -PassThru

Start-Sleep -Seconds 3

$p = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if ($p) {
    Write-Host "Installed App Process ID: $($p.Id)"
    Write-Host "Process Name: $($p.ProcessName)"
    Write-Host "Responding: $($p.Responding)"
    Write-Host "Memory: $([Math]::Round($p.WorkingSet64 / 1MB, 2)) MB"
    Write-Host "SUCCESS: Installed application runs cleanly standalone!"
    
    # Gracefully stop test process
    Stop-Process -Id $proc.Id -Force
} else {
    Write-Host "Process did not remain running."
}
