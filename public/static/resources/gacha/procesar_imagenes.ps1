# Ruta base
$baseDir = "C:\Users\black\Documents\Streams\SAMMI\TsukiSoft_Web\web\public\static\resources\gacha"
$quality = 100
$height = 100 # Altura fija para todas las imágenes

# Procesar cada subcarpeta (db, gs, mh)
Get-ChildItem -Directory $baseDir | ForEach-Object {
    $folder = $_.FullName
    $highDir = Join-Path $folder "high"
    $lowDir = Join-Path $folder "low"

    # Crear la carpeta low si no existe
    if (-Not (Test-Path $lowDir)) {
        New-Item -ItemType Directory -Path $lowDir
    }

    # Procesar todos los archivos _high.webp en la carpeta high
    Get-ChildItem "$highDir\*_high.webp" | ForEach-Object {
        $inputFile = $_.FullName
        $fileName = $_.BaseName -replace "_high$"
        $outputFile = Join-Path $lowDir "${fileName}_low.webp"

        # Convertir manteniendo la altura fija y calidad
        Start-Process -NoNewWindow -FilePath "magick" -ArgumentList @(
            "`"$inputFile`"", # Archivo de entrada
            "-resize", "x$height", # Ajustar altura y mantener proporción
            "-quality", $quality, # Reducir calidad
            "`"$outputFile`""  # Archivo de salida
        ) -Wait

        Write-Host "Procesado: $inputFile -> $outputFile con altura $height"
    }
}

Write-Host "Todas las imágenes han sido procesadas con calidad $quality% y altura $height."
