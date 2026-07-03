Icon files required for installers
===================================
Replace these placeholder files with real icons before building installers:

  icon.ico   — Windows installer icon (256x256 multi-size ICO)
  icon.icns  — macOS app icon (1024x1024 ICNS, with all required sizes)
  icon.png   — Linux app icon (512x512 PNG)
  icon.svg   — Source vector (provided)

Quick conversion using ImageMagick:
  convert icon.svg -resize 512x512 icon.png
  convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

Or use: https://convertico.com  /  https://cloudconvert.com/png-to-icns
