$installDir = [System.IO.Path]::Combine($env:LOCALAPPDATA, 'Programs', 'Study Time Tracker')
$uninstaller = [System.IO.Path]::Combine($installDir, 'Uninstall Study Time Tracker.exe')
$userDataDir = [System.IO.Path]::Combine($env:APPDATA, 'Study Time Tracker')

Write-Host "=========================================="
Write-Host "TESTING UNINSTALLER"
Write-Host "=========================================="
Write-Host "Uninstaller Path: $uninstaller"
Write-Host "Uninstaller Exists: $(Test-Path $uninstaller)"
Write-Host "UserData Path: $userDataDir"
Write-Host "UserData Exists: $(Test-Path $userDataDir)"

if (Test-Path $uninstaller) {
    Write-Host "Running silent uninstall..."
    Start-Process -FilePath $uninstaller -ArgumentList "/S" -Wait
    Start-Sleep -Seconds 3
    
    $stillInstalled = Test-Path $installDir
    Write-Host "Installation Directory Exists after Uninstall: $stillInstalled"
    $userDataStillExists = Test-Path $userDataDir
    Write-Host "UserData Directory Exists after Uninstall (Preserved): $userDataStillExists"
}
Write-Host "=========================================="
