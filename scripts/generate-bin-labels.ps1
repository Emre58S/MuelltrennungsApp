# Datei: scripts/generate-bin-labels.ps1
# Erzeugt die Beschriftungen auf den Tonnen als Bilder (assets/labels/).
# Stil wie die Kapseln der App: heller Aufkleber, Farbpunkt + Name in der
# Tonnenfarbe. In der 3D-Szene liegt er als Textur auf der Tonnen-Front und
# bekommt dasselbe Licht wie die Tonne.
#
# Texte = i18n/de.ts bzw. en.ts ("bin.*"; Umlaute als [char]-Code, weil
# Windows PowerShell 5.1 Skripte ohne BOM nicht als UTF-8 liest).
# Bei Änderungen dort hier anpassen und neu erzeugen:
#   powershell -ExecutionPolicy Bypass -File scripts/generate-bin-labels.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$fontFile = Join-Path $root "node_modules/@expo-google-fonts/atkinson-hyperlegible-next/700Bold/AtkinsonHyperlegibleNext_700Bold.ttf"
$outDir = Join-Path $root "assets/labels"
New-Item -ItemType Directory -Force $outDir | Out-Null

$fonts = New-Object System.Drawing.Text.PrivateFontCollection
$fonts.AddFontFile($fontFile)
$family = $fonts.Families[0]

# Farbe = Tonnenfarbe (constants/theme.ts → BinColors), Schrift etwas dunkler
$bins = @(
  @{ key = "bio";    dot = "#7A5230"; ink = "#4A2F18"; de = "Biom$([char]0x00FC)ll";  en = "Organic" },
  @{ key = "gelb";   dot = "#E8B500"; ink = "#4A3A00"; de = "Gelber Sack";             en = "Yellow bag" },
  @{ key = "rest";   dot = "#4A5560"; ink = "#262D34"; de = "Restm$([char]0x00FC)ll"; en = "General" },
  @{ key = "papier"; dot = "#245E9E"; ink = "#163E6A"; de = "Papier";                  en = "Paper" },
  @{ key = "glas";   dot = "#2E7D4F"; ink = "#1B4D30"; de = "Glas";                    en = "Glass" }
)

$W = 512; $H = 256
# Aufkleber: Kapsel mittig, Platz für Punkt + Text
$pillW = 470; $pillH = 150
$pillX = ($W - $pillW) / 2; $pillY = ($H - $pillH) / 2
$dotD = 44
$textMaxW = $pillW - 64 - $dotD - 22

function New-Pill([float]$x, [float]$y, [float]$w, [float]$h) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $h
  $p.AddArc($x, $y, $d, $d, 90, 180)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 180)
  $p.CloseFigure()
  return $p
}

$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Near
$format.LineAlignment = [System.Drawing.StringAlignment]::Near

foreach ($bin in $bins) {
  foreach ($lang in @("de", "en")) {
    $label = $bin[$lang]

    # Größte Schrift, bei der der Name in eine Zeile passt
    $size = 62
    while ($size -gt 30) {
      $probe = New-Object System.Drawing.Drawing2D.GraphicsPath
      $probe.AddString($label, $family, [int][System.Drawing.FontStyle]::Regular, $size, (New-Object System.Drawing.PointF(0, 0)), $format)
      $b = $probe.GetBounds()
      if ($b.Width -le $textMaxW -and $b.Height -le $pillH - 50) { break }
      $size -= 2
    }

    $bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Aufkleber mit feinem Rand
    $pill = New-Pill $pillX $pillY $pillW $pillH
    $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(242, 250, 249, 245))), $pill)
    $g.DrawPath((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 0, 0, 0), 3)), $pill)

    # Inhalt (Punkt + Text) mittig im Aufkleber
    $text = New-Object System.Drawing.Drawing2D.GraphicsPath
    $text.AddString($label, $family, [int][System.Drawing.FontStyle]::Regular, $size, (New-Object System.Drawing.PointF(0, 0)), $format)
    $tb = $text.GetBounds()
    $contentW = $dotD + 22 + $tb.Width
    $left = ($W - $contentW) / 2
    $cy = $H / 2

    $dotColor = [System.Drawing.ColorTranslator]::FromHtml($bin.dot)
    $g.FillEllipse((New-Object System.Drawing.SolidBrush($dotColor)), [float]$left, [float]($cy - $dotD / 2), [float]$dotD, [float]$dotD)

    $move = New-Object System.Drawing.Drawing2D.Matrix
    $move.Translate([float]($left + $dotD + 22 - $tb.X), [float]($cy - $tb.Height / 2 - $tb.Y))
    $text.Transform($move)
    $ink = [System.Drawing.ColorTranslator]::FromHtml($bin.ink)
    $g.FillPath((New-Object System.Drawing.SolidBrush($ink)), $text)

    $file = Join-Path $outDir "$($bin.key)-$lang.png"
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Output "$file  ($label, $size px)"
  }
}
