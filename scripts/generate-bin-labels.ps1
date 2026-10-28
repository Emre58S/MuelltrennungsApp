# Datei: scripts/generate-bin-labels.ps1
# Erzeugt die Beschriftungen auf den Tonnen als Bilder (assets/labels/).
# Stil wie die Kapseln der App: weißer Aufkleber mit Rand in Tonnenfarbe,
# Bild-Symbol im Farbkreis + Name (gut lesbar, aber dezent; das Symbol hilft
# auch ohne Deutschkenntnisse). In der 3D-Szene liegt er als Textur auf der Tonnen-Front und
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
$dotD = 64
$textMaxW = $pillW - 64 - $dotD - 22

# Kleines weißes Symbol im Farbkreis (Mitte cx/cy, Kreisdurchmesser d)
function Draw-Glyph($g, [string]$key, [float]$cx, [float]$cy, [float]$d) {
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [float]($d * 0.07))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $u = $d / 64
  switch ($key) {
    "bio" {
      # Blatt: spitz zulaufend (zwei Bögen) mit Mittelader + Stiel
      $state = $g.Save()
      $g.TranslateTransform($cx, $cy); $g.RotateTransform(40)
      $leaf = New-Object System.Drawing.Drawing2D.GraphicsPath
      $leaf.AddBezier([float]0, [float](-22 * $u), [float](17 * $u), [float](-10 * $u), [float](15 * $u), [float](10 * $u), [float]0, [float](16 * $u))
      $leaf.AddBezier([float]0, [float](16 * $u), [float](-15 * $u), [float](10 * $u), [float](-17 * $u), [float](-10 * $u), [float]0, [float](-22 * $u))
      $g.FillPath($white, $leaf)
      $vein = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#7A5230"), [float](2.5 * $u))
      $g.DrawLine($vein, [float]0, [float](-14 * $u), [float]0, [float](13 * $u))
      $g.DrawLine($pen, [float]0, [float](15 * $u), [float]0, [float](23 * $u))
      $g.Restore($state)
    }
    "glas" {
      # Flasche: Hals + Körper
      $g.FillRectangle($white, [float]($cx - 4 * $u), [float]($cy - 21 * $u), [float](8 * $u), [float](12 * $u))
      $body = New-Object System.Drawing.Drawing2D.GraphicsPath
      $body.AddArc([float]($cx - 10 * $u), [float]($cy - 13 * $u), [float](20 * $u), [float](12 * $u), 180, 180)
      $body.AddLine([float]($cx + 10 * $u), [float]($cy - 7 * $u), [float]($cx + 10 * $u), [float]($cy + 19 * $u))
      $body.AddLine([float]($cx + 10 * $u), [float]($cy + 19 * $u), [float]($cx - 10 * $u), [float]($cy + 19 * $u))
      $body.CloseFigure()
      $g.FillPath($white, $body)
    }
    "papier" {
      # Blatt mit Zeilen
      $g.FillRectangle($white, [float]($cx - 13 * $u), [float]($cy - 17 * $u), [float](26 * $u), [float](34 * $u))
      $ink = New-Object System.Drawing.Pen((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 36, 94, 158))).Color, [float](3 * $u))
      foreach ($ly in @(-8, 0, 8)) { $g.DrawLine($ink, [float]($cx - 8 * $u), [float]($cy + $ly * $u), [float]($cx + 8 * $u), [float]($cy + $ly * $u)) }
    }
    "gelb" {
      # Kreislauf-Pfeile (♻) aus Segoe UI Symbol
      $sym = New-Object System.Drawing.Font("Segoe UI Symbol", [float](46 * $u), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
      $sf = New-Object System.Drawing.StringFormat
      $sf.Alignment = [System.Drawing.StringAlignment]::Center
      $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
      # Dunkel statt weiß: Weiß auf Gelb hat zu wenig Kontrast
      $dark = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#4A3A00"))
      $g.DrawString([string][char]0x267B, $sym, $dark, (New-Object System.Drawing.RectangleF([float]($cx - $d / 2), [float]($cy - $d / 2 + 2 * $u), [float]$d, [float]$d)), $sf)
    }
    "rest" {
      # Kleine Tonne: Deckel + sich verjüngender Körper
      # Griff oben, Deckel, Körper ohne Spalt, zwei Rillen
      $g.FillRectangle($white, [float]($cx - 5 * $u), [float]($cy - 21 * $u), [float](10 * $u), [float](4 * $u))
      $g.FillRectangle($white, [float]($cx - 14 * $u), [float]($cy - 17 * $u), [float](28 * $u), [float](6 * $u))
      $pts = @(
        (New-Object System.Drawing.PointF([float]($cx - 12 * $u), [float]($cy - 11 * $u))),
        (New-Object System.Drawing.PointF([float]($cx + 12 * $u), [float]($cy - 11 * $u))),
        (New-Object System.Drawing.PointF([float]($cx + 9 * $u), [float]($cy + 18 * $u))),
        (New-Object System.Drawing.PointF([float]($cx - 9 * $u), [float]($cy + 18 * $u)))
      )
      $g.FillPolygon($white, $pts)
      $rib = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#4A5560"), [float](2.5 * $u))
      foreach ($rx in @(-4, 4)) { $g.DrawLine($rib, [float]($cx + $rx * $u), [float]($cy - 6 * $u), [float]($cx + $rx * 0.8 * $u), [float]($cy + 13 * $u)) }
    }
  }
}

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

    # Weißer Aufkleber, Rand in Tonnenfarbe
    $dotColor = [System.Drawing.ColorTranslator]::FromHtml($bin.dot)
    $pill = New-Pill $pillX $pillY $pillW $pillH
    $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))), $pill)
    $g.DrawPath((New-Object System.Drawing.Pen($dotColor, 8)), $pill)

    # Inhalt (Punkt + Text) mittig im Aufkleber
    $text = New-Object System.Drawing.Drawing2D.GraphicsPath
    $text.AddString($label, $family, [int][System.Drawing.FontStyle]::Regular, $size, (New-Object System.Drawing.PointF(0, 0)), $format)
    $tb = $text.GetBounds()
    $contentW = $dotD + 22 + $tb.Width
    $left = ($W - $contentW) / 2
    $cy = $H / 2

    $g.FillEllipse((New-Object System.Drawing.SolidBrush($dotColor)), [float]$left, [float]($cy - $dotD / 2), [float]$dotD, [float]$dotD)
    Draw-Glyph $g $bin.key ([float]($left + $dotD / 2)) ([float]$cy) ([float]$dotD)

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
