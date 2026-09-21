# Atualizar o EXE do One Piece Tactics

> O guia oficial agora esta em [ATUALIZAR.md](ATUALIZAR.md). Ele inclui o fluxo completo do EXE e APK, em etapas separadas.

Guia para gerar uma nova versão do aplicativo Windows e atualizar a pasta `dist-electron` existente.

Execute os comandos no PowerShell integrado do VS Code, a partir da raiz do projeto:

```powershell
Set-Location "C:\Users\kaiqu\Documents\GitHub\ONE_PIECE_TFT\One-Piece-TFT-Auto-Battle-Chess"
```

## Fluxo completo

Altere somente o valor de `$VERSION` para a nova versão desejada:

```powershell
$VERSION = "0.1.0"
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
# Para publicar automaticamente no GitHub Releases, defina GH_TOKEN antes e use --publish always.

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

Remove-Item $TEMP_OUTPUT -Recurse -Force -ErrorAction SilentlyContinue

```powershell
Get-Content package.json | Select-String '"version"'
Get-ChildItem "dist-electron\*0.1.0*" | Select-Object Name,Length,LastWriteTime
```

Troque `0.1.0` pelo valor usado em `$VERSION`.

## Publicar para o launcher atualizar sozinho

O launcher consulta as releases do repositório GitHub configurado no `package.json`.
Cada nova versão precisa ser publicada como uma **Release** com os arquivos gerados pelo electron-builder, incluindo o `latest.yml` e o `.blockmap`.

### Publicação automática pelo electron-builder

Crie um token do GitHub com permissão para publicar releases, informe-o somente no terminal e execute o fluxo acima com `--publish always`:

```powershell
$env:GH_TOKEN = "COLE_SEU_TOKEN_AQUI"
npx electron-builder --win nsis portable --publish always --config.directories.output=$TEMP_OUTPUT
Remove-Item Env:\GH_TOKEN
```

Não salve o token no projeto nem faça commit dele. Depois que a release for publicada, o launcher verifica a versão ao abrir, baixa a atualização e só então oferece o botão para reiniciar e instalar. Se o GitHub estiver indisponível, ele permite entrar offline.

### Publicação manual

Se preferir não usar token no terminal, gere os instaladores sem `--publish`, abra uma release no GitHub e anexe os arquivos `latest.yml`, `*.exe`, `*.blockmap` e, quando existir, `*.yml`/`*.zip` gerados na pasta temporária. A tag da release deve corresponder à versão do `package.json`, por exemplo `v0.1.0`.

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
$VERSION = "0.1.0"
$PROJECT = "C:\Users\kaiqu\Documents\GitHub\ONE_PIECE_TFT\One-Piece-TFT-Auto-Battle-Chess"
$TEMP_OUTPUT = Join-Path $env:TEMP "one-piece-tft-electron-$VERSION-portable"
Set-Location $PROJECT
Remove-Item $TEMP_OUTPUT -Recurse -Force -ErrorAction SilentlyContinue
npx electron-builder --win portable --config.directories.output=$TEMP_OUTPUT
Copy-Item (Join-Path $TEMP_OUTPUT "One Piece Tactics $VERSION.exe") (Join-Path $PROJECT "dist-electron") -Force
```
