Add-Type -AssemblyName System.Drawing
$assetDir = Join-Path $PSScriptRoot '..\assets'
New-Item -ItemType Directory -Path $assetDir -Force | Out-Null
$bitmap = New-Object System.Drawing.Bitmap 256,256
$canvas = [System.Drawing.Graphics]::FromImage($bitmap)
$canvas.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$canvas.Clear([System.Drawing.ColorTranslator]::FromHtml('#101d2e'))
$mint = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#64d9be')),9
$muted = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#36516b')),5
$canvas.DrawEllipse($muted,22,22,212,212)
$canvas.DrawArc($mint,22,22,212,212,30,120)
$canvas.DrawArc($mint,22,22,212,212,210,90)
$points = [System.Drawing.Point[]]@([System.Drawing.Point]::new(128,47),[System.Drawing.Point]::new(140,105),[System.Drawing.Point]::new(200,145),[System.Drawing.Point]::new(200,158),[System.Drawing.Point]::new(140,140),[System.Drawing.Point]::new(140,180),[System.Drawing.Point]::new(161,196),[System.Drawing.Point]::new(161,205),[System.Drawing.Point]::new(128,193),[System.Drawing.Point]::new(95,205),[System.Drawing.Point]::new(95,196),[System.Drawing.Point]::new(116,180),[System.Drawing.Point]::new(116,140),[System.Drawing.Point]::new(56,158),[System.Drawing.Point]::new(56,145),[System.Drawing.Point]::new(116,105))
$canvas.FillPolygon([System.Drawing.Brushes]::White,$points)
$bitmap.Save((Join-Path $assetDir 'icon.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Dispose()
$bitmap.Dispose()
$png = [System.IO.File]::ReadAllBytes((Join-Path $assetDir 'icon.png'))
$stream = [System.IO.File]::Create((Join-Path $assetDir 'icon.ico'))
$writer = [System.IO.BinaryWriter]::new($stream)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
$writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
$writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$png.Length); $writer.Write([uint32]22); $writer.Write($png)
$writer.Close()
