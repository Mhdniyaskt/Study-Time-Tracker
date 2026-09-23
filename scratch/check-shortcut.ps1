$sh = New-Object -ComObject WScript.Shell
$lnkPath = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Study Time Tracker.lnk')
if (Test-Path $lnkPath) {
    $lnk = $sh.CreateShortcut($lnkPath)
    Write-Host "Shortcut Target: $($lnk.TargetPath)"
    Write-Host "Target Exists: $(Test-Path $lnk.TargetPath)"
} else {
    Write-Host "Shortcut not found"
}
