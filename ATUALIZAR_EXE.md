# Atualizar o EXE do One Piece Tactics

Guia para gerar uma nova versão do aplicativo Windows e atualizar a pasta `dist-electron` existente.

Execute os comandos no PowerShell integrado do VS Code, a partir da raiz do projeto:

```powershell
Set-Location "C:\Users\kaiqu\Documents\GitHub\ONE_PIECE_TFT\One-Piece-TFT-Auto-Battle-Chess"
```

## Fluxo completo

Altere somente o valor de `$VERSION` para a nova versão desejada:

```powershell
$VERSION = "0.0.6"
$PROJECT = "C:\Users\kaiqu\Documents\GitHub\ONE_PIECE_TFT\One-Piece-TFT-Auto-Battle-Chess"
$OUTPUT = Join-Path $PROJECT "dist-electron"
$TEMP_OUTPUT = Join-Path $env:TEMP "one-piece-tft-electron-$VERSION"

Set-Location $PROJECT

# Atualiza package.json sem criar tag ou commit Git.
npm version $VERSION --no-git-tag-version

# Valida o TypeScript e gera o bundle web.
npm run lint
npm run build

# Fecha instancias que podem bloquear app.asar ou arquivos do instalador.
Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like "One Piece Tactics*" } | Stop-Process -Force
taskkill /F /IM 7za.exe /T 2>$null
 taskkill /F /IM electron.exe /T 2>$null

# Gera NSIS e portable fora do projeto para evitar locks e empacotamento recursivo.
Remove-Item $TEMP_OUTPUT -Recurse -Force -ErrorAction SilentlyContinue
npx electron-builder --win nsis portable --config.directories.output=$TEMP_OUTPUT

# Remove os artefatos da versão anterior da pasta final.
Remove-Item (Join-Path $OUTPUT "One Piece Tactics *.exe") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $OUTPUT "One Piece Tactics Setup *.exe") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $OUTPUT "One Piece Tactics Setup *.exe.blockmap") -Force -ErrorAction SilentlyContinue

# Copia somente os arquivos finais para a pasta dist-electron existente.
Copy-Item (Join-Path $TEMP_OUTPUT "One Piece Tactics Setup $VERSION.exe") $OUTPUT -Force
Copy-Item (Join-Path $TEMP_OUTPUT "One Piece Tactics Setup $VERSION.exe.blockmap") $OUTPUT -Force
Copy-Item (Join-Path $TEMP_OUTPUT "One Piece Tactics $VERSION.exe") $OUTPUT -Force

# Confirma os artefatos gerados.
Get-ChildItem $OUTPUT -File | Where-Object { $_.Name -like "*$VERSION*" } | Select-Object Name,Length,LastWriteTime
```

## Arquivos gerados

Na pasta `dist-electron` devem aparecer:

- `One Piece Tactics Setup X.Y.Z.exe`: instalador NSIS. Use este para desinstalar a versão antiga e instalar a nova.
- `One Piece Tactics Setup X.Y.Z.exe.blockmap`: arquivo auxiliar do instalador/atualização.
- `One Piece Tactics X.Y.Z.exe`: versão portátil, sem instalação.

## Verificar a versão

```powershell
Get-Content package.json | Select-String '"version"'
Get-ChildItem "dist-electron\*0.0.6*" | Select-Object Name,Length,LastWriteTime
```

Troque `0.0.6` pelo valor usado em `$VERSION`.

## Se o build falhar com arquivo bloqueado

Feche qualquer janela do jogo e execute:

```powershell
Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like "One Piece Tactics*" } | Stop-Process -Force
taskkill /F /IM 7za.exe /T 2>$null
taskkill /F /IM electron.exe /T 2>$null
```

Depois repita a partir da linha que define `$TEMP_OUTPUT`. O procedimento usa uma pasta temporária para a compilação, portanto não é necessário apagar `dist-electron` inteira.

## Apenas portátil

Se quiser gerar somente o EXE portátil:

```powershell
$VERSION = "0.0.6"
$PROJECT = "C:\Users\kaiqu\Documents\GitHub\ONE_PIECE_TFT\One-Piece-TFT-Auto-Battle-Chess"
$TEMP_OUTPUT = Join-Path $env:TEMP "one-piece-tft-electron-$VERSION-portable"
Set-Location $PROJECT
Remove-Item $TEMP_OUTPUT -Recurse -Force -ErrorAction SilentlyContinue
npx electron-builder --win portable --config.directories.output=$TEMP_OUTPUT
Copy-Item (Join-Path $TEMP_OUTPUT "One Piece Tactics $VERSION.exe") (Join-Path $PROJECT "dist-electron") -Force
```
