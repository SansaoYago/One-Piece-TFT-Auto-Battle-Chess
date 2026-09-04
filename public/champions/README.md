# 🎨 Estrutura de Imagens dos Campeões (One Piece Auto Chess)

Este diretório foi configurado para carregar automaticamente as imagens dos personagens em **3 estados visuais distintos** com **fallback automático para emoji** caso a imagem ainda não exista ou esteja sendo testada.

---

## 📁 Estrutura de Pastas

```text
public/
  champions/
    portraits/   <-- 🖼️ Retratos/Avatares (Loja, Banco, Inspetor, Sinergias e DPS)
    sprites/     <-- ⚔️ Poses de Combate / Sprites 2.5D no Tabuleiro
    dragging/    <-- 🖐️ Efeito Flutuante quando você segura/arrasta a unidade
```

---

## 📐 Especificações Recomendadas para Testes

| Categoria | Caminho | Resolução Recomendada | Formato | Dica |
|---|---|---|---|---|
| **Retratos (Portraits)** | `/public/champions/portraits/{id}.png` | 128x128 até 256x256 px | PNG / WebP com transparência | Busto/Rosto do personagem |
| **Combate (Sprites)** | `/public/champions/sprites/{id}.png` | 150x150 até 300x300 px | PNG / WebP com transparência | Corpo inteiro ou pose de batalha |
| **Arrastando (Dragging)** | `/public/champions/dragging/{id}.png` | 150x150 até 300x300 px | PNG / WebP com transparência | Opcional (se não existir, usa o portrait) |

---

## 📋 Lista Completa de IDs dos Campeões no Jogo

Basta nomear o arquivo `.png` com o **ID exato** listado abaixo:

### Tier 1 (Custo 1฿)
- `luffy.png` — Monkey D. Luffy 👒
- `nami.png` — Nami 🍊
- `usopp.png` — Usopp 🎯
- `buggy.png` — Buggy, o Palhaço 🎪
- `alvida.png` — Alvida Clava de Ferro 🪓
- `koby.png` — Koby Recruta 🌸
- `helmeppo.png` — Helmeppo Kukri 🗡️

### Tier 2 (Custo 2฿)
- `zoro.png` — Roronoa Zoro ⚔️
- `sanji.png` — Vinsmoke Sanji 🦵
- `chopper.png` — Tony Tony Chopper 🦌
- `smoker.png` — Capitão Smoker 💨
- `tashigi.png` — Tashigi Espadachim 🌸
- `arlong.png` — Arlong Tubarão-Serra 🦈
- `kuro.png` — Capitão Kuro 🐱
- `krieg.png` — Don Krieg Armadura de Aço 🛡️
- `gin.png` — Gin Demônio das Tonfas 💣

### Tier 3 (Custo 3฿)
- `robin.png` — Nico Robin 🌸
- `franky.png` — Franky Cyborg 🤖
- `brook.png` — Brook Soul King 🎻
- `bonclay.png` — Bon Clay (Mr. 2) 🦢
- `mr1.png` — Mr. 1 (Daz Bonez) 🔪
- `mr3.png` — Mr. 3 Galdino 🕯️
- `croc.png` — Sir Crocodile 🐊
- `ace.png` — Portgas D. Ace 🔥

### Tier 4 (Custo 4฿)
- `jinbe.png` — Cavaleiro dos Mares Jinbe 🌊
- `law.png` — Trafalgar D. Water Law 🩺
- `kid.png` — Eustass "Captain" Kid 🧲
- `doflamingo.png` — Donquixote Doflamingo 🦩
- `hancock.png` — Boa Hancock 🐍
- `kuma.png` — Bartholomew Kuma 🐾
- `mihawk.png` — Dracule Mihawk 🦅

### Tier 5 (Custo 5฿ - Lendários)
- `shanks.png` — Shanks o Ruivo 🏴‍☠️
- `blackbeard.png` — Marshall D. Teach (Barba Negra) 🕳️
- `whitebeard.png` — Edward Newgate (Barba Branca) 🌊
- `kaido.png` — Kaido das Cem Feras 🐉
- `bigmom.png` — Charlotte Linlin (Big Mom) 🎂
- `garp.png` — Monkey D. Garp O Herói 👊
- `dragon.png` — Monkey D. Dragon 🌪️
- `kuzan.png` — Almirante Aokiji (Kuzan) ❄️
- `borsalino.png` — Almirante Kizaru (Borsalino) ⚡
- `sakazuki.png` — Almirante Akainu (Sakazuki) 🌋
- `fujitora.png` — Almirante Fujitora (Issho) ☄️

---

## 💡 Exemplos Rápidos de Teste

1. Se você colocar um arquivo em `public/champions/portraits/luffy.png`, a loja, o banco e os painéis de Luffy passarão a exibir esse retrato instantaneamente!
2. Se você colocar `public/champions/sprites/luffy.png`, o Luffy no tabuleiro de combate passará a exibir o sprite de batalha!
3. Se um personagem **não** tiver imagem ainda, ele continua exibindo o emoji normalmente sem gerar erros visuais.
