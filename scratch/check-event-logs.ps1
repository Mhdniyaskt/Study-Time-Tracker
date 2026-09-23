$events = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2; StartTime=(Get-Date).AddHours(-2)} -ErrorAction SilentlyContinue | Where-Object { $_.Message -like "*Study*" -or $_.ProviderName -like "*Electron*" }
if ($events) {
    $events | Select-Object TimeCreated, ProviderName, Id, Message | Format-List
} else {
    Write-Host "0 Windows Application Event Log errors for Study Time Tracker in the last 2 hours."
}
