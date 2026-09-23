$installDir = [System.IO.Path]::Combine($env:LOCALAPPDATA, 'Programs', 'Study Time Tracker')
$installedExe = [System.IO.Path]::Combine($installDir, 'Study Time Tracker.exe')
$uninstaller = [System.IO.Path]::Combine($installDir, 'Uninstall Study Time Tracker.exe')
$desktopLnk = [System.IO.Path]::Combine($env:USERPROFILE, 'Desktop', 'Study Time Tracker.lnk')
$startLnk = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Study Time Tracker.lnk')

Write-Host "=========================================="
Write-Host "VERIFYING NSIS INSTALLATION"
Write-Host "=========================================="
Write-Host "Install Directory Exists: $(Test-Path $installDir)"
Write-Host "Study Time Tracker.exe Exists: $(Test-Path $installedExe)"
Write-Host "Uninstaller Exists: $(Test-Path $uninstaller)"
Write-Host "Desktop Shortcut Exists: $(Test-Path $desktopLnk)"
Write-Host "Start Menu Shortcut Exists: $(Test-Path $startLnk)"

if (Test-Path $installedExe) {
    $item = Get-Item $installedExe
    Write-Host "Installed Executable Size: $([Math]::Round($item.Length / 1MB, 2)) MB"
    Write-Host "File Version: $($item.VersionInfo.FileVersion)"
    Write-Host "Product Version: $($item.VersionInfo.ProductVersion)"
}

Write-Host "=========================================="
