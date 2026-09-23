Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\conne\.gemini\antigravity-ide\brain\23964958-470e-44af-83db-3b69d25736e1\study_tracker_app_icon_1790151629993.jpg"
$destPng = "c:\Users\conne\Study-Time-Tracker\build\icon.png"
$destIco = "c:\Users\conne\Study-Time-Tracker\build\icon.ico"

# 1. Resize to 256x256 PNG
$src = [System.Drawing.Image]::FromFile($srcPath)
$bmp256 = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp256)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 256, 256)
$g.Dispose()
$src.Dispose()

# Save PNG
$bmp256.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $destPng"

# 2. Build multi-resolution ICO (256, 48, 32, 16)
# An ICO file can embed PNG files directly for modern Windows (Vista, 7, 8, 10, 11)
# Create memory streams for each size
$sizes = @(256, 48, 32, 16)
$pngBytesList = @()

foreach ($sz in $sizes) {
    if ($sz -eq 256) {
        $resizedBmp = $bmp256
    } else {
        $resizedBmp = New-Object System.Drawing.Bitmap $sz, $sz
        $rg = [System.Drawing.Graphics]::FromImage($resizedBmp)
        $rg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $rg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $rg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $rg.DrawImage($bmp256, 0, 0, $sz, $sz)
        $rg.Dispose()
    }
    
    $ms = New-Object System.IO.MemoryStream
    $resizedBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytesList += ,@($sz, $ms.ToArray())
    $ms.Dispose()
    if ($sz -ne 256) { $resizedBmp.Dispose() }
}
$bmp256.Dispose()

# Write ICO binary
$fs = [System.IO.File]::Create($destIco)
$bw = New-Object System.IO.BinaryWriter $fs

# ICONDIR header (6 bytes)
$bw.Write([UInt16]0) # Reserved
$bw.Write([UInt16]1) # Type (1 = ICO)
$bw.Write([UInt16]$pngBytesList.Count) # Image count

# Calculate offsets
$offset = 6 + (16 * $pngBytesList.Count)

# Write ICONDIRENTRY (16 bytes per image)
foreach ($item in $pngBytesList) {
    $sz = $item[0]
    $data = $item[1]
    
    $w = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $h = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    
    $bw.Write($w)             # Width (0 = 256)
    $bw.Write($h)             # Height (0 = 256)
    $bw.Write([byte]0)        # ColorCount
    $bw.Write([byte]0)        # Reserved
    $bw.Write([UInt16]1)      # Planes
    $bw.Write([UInt16]32)     # BitCount (32-bit RGBA)
    $bw.Write([UInt32]$data.Length) # BytesInRes
    $bw.Write([UInt32]$offset)      # ImageOffset
    
    $offset += $data.Length
}

# Write Image Data (PNG streams)
foreach ($item in $pngBytesList) {
    $data = $item[1]
    $bw.Write($data)
}

$bw.Close()
$fs.Close()
Write-Host "Saved: $destIco"
