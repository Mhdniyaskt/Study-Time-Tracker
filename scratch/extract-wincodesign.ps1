$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
$targetDir = "$cacheDir\winCodeSign-2.6.0"
$sevenZip = "C:\Users\conne\Study-Time-Tracker\node_modules\7zip-bin\win\x64\7za.exe"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$archive = Get-ChildItem -Path $cacheDir -Filter "*.7z" | Select-Object -First 1

if ($archive) {
    Write-Host "Extracting $($archive.FullName) to $targetDir excluding darwin..."
    & $sevenZip x -snld -bd $archive.FullName "-o$targetDir" "-xr!darwin" -y
    Write-Host "Extraction complete!"
    Get-ChildItem -Path $targetDir
} else {
    Write-Error "Archive not found"
}
