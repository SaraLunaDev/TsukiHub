# Ruta de la carpeta actual
$folderPath = Get-Location

# Crear la carpeta "webp" si no existe
$webpFolder = "$folderPath\webp"
if (-not (Test-Path -Path $webpFolder)) {
    New-Item -Path $webpFolder -ItemType Directory
}

# Convertir todos los archivos PNG a WebP y agregar el sufijo "_high"
Get-ChildItem -Path $folderPath -Filter *.png | ForEach-Object {
    $inputFile = $_.FullName
    $outputFile = "$webpFolder\$($_.BaseName)_high.webp"
    
    # Ejecutar ImageMagick usando 'magick' en lugar de 'convert'
    magick $inputFile $outputFile
}
