# Datei: scripts/generate-bin-labels.ps1
# Erzeugt die Beschriftungen auf den Tonnen als Bilder (assets/labels/).
# Sie werden in der 3D-Szene als Textur auf die Tonnen-Front gelegt und
# bekommen dort dasselbe Licht wie die Tonne (wirkt wie aufgedruckt).
#
# Texte = i18n/de.ts bzw. en.ts ("bin.*"; Umlaute als [char]-Code, weil
# Windows PowerShell 5.1 Skripte ohne BOM nicht als UTF-8 liest). Bei Änderungen dort hier
# anpassen und neu erzeugen:
#   powershell -ExecutionPolicy Bypass -File scripts/generate-bin-labels.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$fontFile = Join-Path $root "node_modules/@expo-google-fonts/atkinson-hyperlegible-next/800ExtraBold/AtkinsonHyperlegibleNext_800ExtraBold.ttf"
$outDir = Join-Path $root "assets/labels"
New-Item -ItemType Directory -Force $outDir | Out-Null

$fonts = New-Object System.Drawing.Text.PrivateFontCollection
$fonts.AddFontFile($fontFile)
$family = $fonts.Families[0]

# Schriftfarbe passend zur Tonnenfarbe (constants/theme.ts → BinColors.on)
$bins = @(
  @{ key = "bio";    light = $true;  de = "Biom$([char]0x00FC)ll";    en = "Organic waste" },
  @{ key = "gelb";   light = $false; de = "Gelber Sack"; en = "Yellow bag" },
  @{ key = "rest";   light = $true;  de = "Restm$([char]0x00FC)ll";   en = "General waste" },
  @{ key = "papier"; light = $true;  de = "Papier";      en = "Paper" },
  @{ key = "glas";   light = $true;  de = "Glas";        en = "Glass" }
)

$W = 512; $H = 256
$boxW = 430; $boxH = 170

function New-RoundedRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Get-TextPath([string[]]$lines, [float]$size) {
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $text = $lines -join "`n"
  $rect = New-Object System.Drawing.RectangleF(0, 0, $W, $H)
  $p.AddString($text, $family, [int][System.Drawing.FontStyle]::Regular, $size, $rect, $format)
  return $p
}

foreach ($bin in $bins) {
  foreach ($lang in @("de", "en")) {
    $label = $bin[$lang]
    # Eine Zeile, wenn sie passt – sonst am Leerzeichen umbrechen
    $options = @(, @($label))
    if ($label.Contains(" ")) { $options += , ($label -split " ", 2) }

    $best = $null; $bestSize = 0
    foreach ($lines in $options) {
      for ($size = 96; $size -ge 30; $size -= 2) {
        $path = Get-TextPath $lines $size
        $b = $path.GetBounds()
        if ($b.Width -le $boxW -and $b.Height -le $boxH) {
          if ($size -gt $bestSize) { $best = $lines; $bestSize = $size }
          break
        }
      }
    }

    $bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    if ($bin.light) {
      $ink = [System.Drawing.Color]::FromArgb(240, 246, 244, 236)
      $relief = [System.Drawing.Color]::FromArgb(90, 0, 0, 0)
    } else {
      $ink = [System.Drawing.Color]::FromArgb(235, 42, 34, 0)
      $relief = [System.Drawing.Color]::FromArgb(110, 255, 255, 255)
    }

    # Geprägter Rahmen (wie ein eingegossenes Schild)
    $frame = New-RoundedRect 14 14 ($W - 28) ($H - 28) 34
    $shift = New-Object System.Drawing.Drawing2D.Matrix
    $shift.Translate(0, 4)
    $frameRelief = $frame.Clone(); $frameRelief.Transform($shift)
    $g.DrawPath((New-Object System.Drawing.Pen($relief, 7)), $frameRelief)
    $g.DrawPath((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(150, $ink.R, $ink.G, $ink.B), 7)), $frame)

    # Schrift mit leichter Prägung (Schatten nach unten)
    $text = Get-TextPath $best $bestSize
    $textRelief = $text.Clone(); $textRelief.Transform($shift)
    $g.FillPath((New-Object System.Drawing.SolidBrush($relief)), $textRelief)
    $g.FillPath((New-Object System.Drawing.SolidBrush($ink)), $text)

    $file = Join-Path $outDir "$($bin.key)-$lang.png"
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Output "$file  ($($best -join ' / '), $bestSize px)"
  }
}
