# Atualizar EXE e APK do One Piece Tactics

Você pode gerar as novas versões do Windows (EXE) e do Android (APK) de duas formas:
- **Método 1 (Recomendado):** Totalmente automático pelo **GitHub Actions** na nuvem (em 1 clique, sem precisar de Copilot, sem instalar JDK/Android Studio e sem erros de arquivos presos no Windows).
- **Método 2:** Manual pelo PowerShell no computador local.

---

## 🚀 Método 1: Compilação Automática no GitHub Actions (Recomendado)

O GitHub Actions compila o instalador `.exe` e o pacote `.apk` em servidores virtuais dedicados (Windows e Ubuntu) e publica a Release automaticamente com todos os links de download.

### Passo 1: Garantir permissão de Release no GitHub (Apenas 1ª vez)
1. No seu repositório no GitHub (`https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess`), clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Actions** > **General**.
3. Role a página até **Workflow permissions** e selecione **"Read and write permissions"**.
4. Marque a caixinha *"Allow GitHub Actions to create and approve pull requests"* se houver e clique em **Save**.

### Passo 2: Disparar a Compilação em 1 Clique
1. Vá até a aba **Actions** no topo do repositório no GitHub.
2. Na lista à esquerda, clique em **Build & Release (EXE & APK)**.
3. No lado direito, clique no menu azul **"Run workflow"**.
4. Preencha os campos (ou deixe em branco para usar a versão atual):
   - **Versão:** ex. `0.1.6`
   - **versionCode Android:** ex. `16`
   - **Publicar Release no GitHub:** Deixe marcado como `true`.
   - **Notas da versão:** Digite uma breve descrição das novidades.
5. Clique no botão verde **Run workflow**.

O GitHub Actions irá executar:
- Compilar o executável Windows (`One Piece Tactics Setup X.Y.Z.exe`, `.blockmap`, `latest.yml` e o portable).
- Compilar o aplicativo Android (`One.Piece.TFT.X.Y.Z.apk`) com Java 21 e Android SDK.
- Publicar a **Release pública** com todos os arquivos prontos para download.
- Disponibilizar os artefatos também para download direto na aba da Action.

---

## 🛠️ Método 2: Compilação Manual Local (PowerShell)

Este é o guia manual caso deseje compilar diretamente na sua máquina Windows.
Execute sempre as etapas nesta ordem:

1. Definir a versao uma unica vez.
2. Gerar e validar o EXE.
3. Gerar e validar o APK.
4. Publicar uma unica Release com os artefatos das duas plataformas.

Nao reutilize uma versao ja publicada. Se `0.1.5` ja existe, use `0.1.6`.

### 1. Definir a versao

Execute a partir da raiz do projeto:

```powershell
$PROJECT = "C:\Users\kaiqu\Documents\GitHub\ONE_PIECE_TFT\One-Piece-TFT-Auto-Battle-Chess"
$VERSION = "0.1.6"
$VERSION_CODE = 16
Set-Location $PROJECT
```

Regras:

- `package.json` e `VERSION.md` usam `$VERSION`.
- `android/app/build.gradle` usa `versionName "$VERSION"`.
- `versionCode` Android deve ser um inteiro maior que o anterior. Nunca diminua ou reutilize.
- Para `0.1.5`, o `versionCode` usado foi `15`; para a proxima versao, use `16`.

Atualize esses tres valores antes do primeiro build:

```powershell
npm version $VERSION --no-git-tag-version
(Get-Content "android\app\build.gradle") -replace 'versionCode \d+', "versionCode $VERSION_CODE" -replace 'versionName "[^"]+"', "versionName \"$VERSION\"" | Set-Content "android\app\build.gradle"
Set-Content "VERSION.md" $VERSION
```

Confira:

```powershell
(Get-Content package.json -Raw | ConvertFrom-Json).version
Get-Content VERSION.md
Select-String "versionCode|versionName" android\app\build.gradle
```

## 2. Gerar o EXE primeiro

Valide e gere os bundles:

```powershell
npm run lint
npm run build
```

Feche instancias que possam bloquear o empacotamento:

```powershell
Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like "One Piece Tactics*" } | Stop-Process -Force -ErrorAction SilentlyContinue
taskkill /F /IM 7za.exe /T 2>$null
taskkill /F /IM electron.exe /T 2>$null
```

Empacote fora de `dist-electron`:

```powershell
$TEMP_EXE = Join-Path $env:TEMP "one-piece-tft-electron-$VERSION"
Remove-Item $TEMP_EXE -Recurse -Force -ErrorAction SilentlyContinue
npx electron-builder --win nsis portable --config.directories.output=$TEMP_EXE
```

Copie os arquivos finais:

```powershell
$OUTPUT = Join-Path $PROJECT "dist-electron"
Copy-Item (Join-Path $TEMP_EXE "One Piece Tactics Setup $VERSION.exe") $OUTPUT -Force
Copy-Item (Join-Path $TEMP_EXE "One Piece Tactics Setup $VERSION.exe.blockmap") $OUTPUT -Force
Copy-Item (Join-Path $TEMP_EXE "One Piece Tactics $VERSION.exe") $OUTPUT -Force
Copy-Item (Join-Path $TEMP_EXE "latest.yml") $OUTPUT -Force
```

Valide o EXE:

```powershell
$exeInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo((Join-Path $OUTPUT "One Piece Tactics Setup $VERSION.exe"))
$exeInfo.FileVersion
Get-ChildItem $OUTPUT -File | Where-Object { $_.Name -like "*$VERSION*" } | Select-Object Name,Length
```

O `FileVersion` precisa ser igual a `$VERSION`.

## 3. Gerar o APK depois

O projeto usa Capacitor 8 e exige Java 21 ou superior. Nesta maquina, o JDK valido fica no Android Studio:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;" + (($env:Path -split ';' | Where-Object { $_ -notmatch 'Java|jdk|jbr' }) -join ';')
```

O APK precisa ter a mesma assinatura do APK instalado anteriormente. Para testes locais, `assembleDebug` usa a chave debug da maquina. Para distribuicao real, configure uma chave release permanente e nunca troque essa chave entre versoes.

Sincronize e compile:

```powershell
npm run android:apk
```

Copie o APK com o nome que sera usado na Release:

```powershell
$ANDROID_OUTPUT = Join-Path $PROJECT "dist-android"
New-Item -ItemType Directory -Force $ANDROID_OUTPUT | Out-Null
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" (Join-Path $ANDROID_OUTPUT "One.Piece.TFT.$VERSION.apk") -Force
Get-Item (Join-Path $ANDROID_OUTPUT "One.Piece.TFT.$VERSION.apk") | Select-Object Name,Length,LastWriteTime
```

O APK atualiza sem desinstalar quando:

- o `applicationId` continua `com.seunome.onepiecetft`;
- a assinatura e a mesma;
- `versionCode` e maior;
- o usuario confirma a instalacao do Android;
- a URL do APK esta publica.

## 4. Atualizar o manifesto Android

Edite `public/android-update.json` para a mesma versao do APK:

```json
{
  "version": "0.1.6",
  "versionCode": 16,
  "downloadUrl": "https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/download/v0.1.6/One.Piece.TFT.0.1.6.apk",
  "releaseNotes": "Descricao curta da atualizacao."
}
```

O APK incorpora esse arquivo durante `npm run android:apk`. Portanto, se alterar o manifesto depois do build, gere o APK novamente.

A URL padrao do app e:

`https://raw.githubusercontent.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/main/public/android-update.json`

O repositorio ou o endpoint precisam ser publicos. GitHub Releases privadas nao podem ser baixadas anonimamente pelo EXE ou pelo Android.

## 5. Validar antes de publicar

```powershell
npm run lint
$packageVersion = (Get-Content package.json -Raw | ConvertFrom-Json).version
$androidManifest = Get-Content "public\android-update.json" -Raw | ConvertFrom-Json
[PSCustomObject]@{
  PackageVersion = $packageVersion
  AndroidVersion = $androidManifest.version
  AndroidVersionCode = $androidManifest.versionCode
  ApkExists = Test-Path (Join-Path $ANDROID_OUTPUT "One.Piece.TFT.$VERSION.apk")
}
```

As versoes precisam ser iguais e `ApkExists` precisa ser `True`.

## 6. Publicar uma unica Release

Crie a tag `v$VERSION` a partir da branch que recebeu o commit e publique como release estavel.

Anexe os arquivos:

- `dist-electron\latest.yml`
- `dist-electron\One Piece Tactics Setup X.Y.Z.exe`
- `dist-electron\One Piece Tactics Setup X.Y.Z.exe.blockmap`
- `dist-android\One.Piece.TFT.X.Y.Z.apk`

O EXE portatil e opcional:

- `dist-electron\One Piece Tactics X.Y.Z.exe`

Depois do upload, confira os nomes dos assets. Se o GitHub normalizar espacos para pontos, `latest.yml` precisa apontar para o nome final exibido no asset do instalador. O hash e o tamanho precisam continuar sendo os do instalador correspondente.

Nao marque a Release como `Pre-release` e publique como `Latest release`.

## 7. Testar as tres plataformas

- Web: abrir o endereco do ambiente web.
- EXE: abrir uma instalacao anterior e aguardar o launcher detectar a Release.
- APK: instalar o APK atual, publicar uma versao posterior com `versionCode` maior e abrir o app. O modal inicial deve mostrar a nova versao; ao confirmar, o Android baixa e abre a instalacao sem apagar os dados.

A atualizacao Android nao e silenciosa: o sistema sempre pode pedir confirmacao e, na primeira vez, permissao para instalar aplicativos desta fonte.

## Problemas comuns

- `JAVA_HOME` com caminho invalido: use o JDK do Android Studio acima.
- `invalid source release: 21`: o Gradle esta usando Java 17; corrija `JAVA_HOME`.
- `INSTALL_FAILED_UPDATE_INCOMPATIBLE`: a assinatura do APK mudou. Recompile com a mesma chave ou reinstale apenas em ambiente de teste.
- App Android nao encontra atualizacao: torne `android-update.json` e o APK publicos e confirme `versionCode` maior.
- Launcher Windows offline: confirme que a Release e publica e que `latest.yml` aponta para o asset real.
- APK nao atualiza apos mudar `android-update.json`: gere o APK novamente, pois o manifesto e empacotado dentro dele.
