# 📜 Documento de Requisitos do Produto (PRD) — Auto Battler MVP (One Piece Tactics)

**Versão**: 1.0.0 (MVP)  
**Tipo**: Auto Battler / Simulador Tático em Tempo Real  
**Stack**: React 19 + TypeScript + Tailwind CSS + WebGL / Canvas de Alta Performance  
**Universo & Tema**: Piratas / Anime (One Piece)  
**Moeda Oficial**: Berries / Beli (฿)

---

## 1. Visão Geral e Objetivos do Produto

### 1.1 Objetivo do MVP
Desenvolver o **motor de batalha central** de um Auto Battler estilo TFT / Pokémon Auto Chess, com simulação em tempo real a 60 FPS, física vetorial de projéteis, movimentação fluida, sistema de mana/habilidades, mitigação de dano (físico, mágico, Haki/verdadeiro), sinergias com múltiplos tiers (com ênfase na classe Brigão) e sistema de itens/chips de sinergia.

### 1.2 Princípios de Arquitetura & Engenharia (Anti-Quebra)
- **Zero Monolito**: Todo o código é distribuído em módulos atômicos isolados (`src/types/`, `src/data/`, `src/engine/`, `src/components/`).
- **Simulador Desacoplado da UI**: O motor de ticks de combate (`combatSimulator.ts`) é uma máquina de estado determinística pura em TypeScript, que roda independentemente de renderização visual.
- **Entrada Direta em Arena de Batalha (Sandbox)**: Sem telas de login ou fluxos de espera; a aplicação inicializa diretamente na cena tática com controles de simulação para validação rápida.

---

## 2. Layout da Tela e Zonas Visuais (Baseado na UI do Jogo de Referência)

### 2.1 Estrutura do Layout (16:9 Widescreen & Vista Isométrica)

```
+-----------------------------------------------------------------------------------------------------+
| [TOPO ESQUERDA]           | [CENTRO TOPO]               | [TOPO DIREITA]                            |
| Tempo (ex: 00:54)         | FASE ATUAL: Combate / Prep  | Ícones de Configurações, Ajuda & Menus    |
| Round Atual (ex: 2º Round)| Contador Regressivo (ex: 43)|                                           |
+-----------------------------------------------------------------------------------------------------+
| [LATERAL ESQUERDA]        |                   [CENTRO - TABULEIRO]               | [LATERAL DIREITA]|
| Lista Limpa dos 8         |          ARENA ISOMÉTRICA DE COMBATE                 | Menu de Abas     |
| Comandantes do Lobby:     |             (Perspectiva 3D Tática)                  | Multifuncional:  |
| - Avatar do Jogador       |                                                      |                  |
| - Nome do Jogador         |     [Campo Inimigo / Spawn de Marinheiros/Bots]      | [📋] Sinergias   |
| - Barra de Vida do Player |                                                      | [🎒] Baú Itens   |
|   (HP Inicial: 50 a 100)  |     [Círculo Central da Arena / Ponto de Choque]     | [⚔️] Painel DPS   |
| - Nível do Player         |                                                      |                  |
| - Posição/Rank na partida |     [Campo do Jogador / Posicionamento Tático]       | [Container       |
| (Sem poluição de itens)   |                                                      |  Dinâmico da     |
|                           |     [Contador de Unidades em Campo (ex: 2/3)]        |  Aba Ativa]      |
+---------------------------+------------------------------------------------------+------------------+
| [RODAPÉ INFERIOR]                                                                                   |
| [Banco de Reservas: 8 Slots com Slots Circulares/Hexagonais] | [Nível/XP] | [Botão da Loja de Beli]  |
| (Unidades de reserva exibidas com estrelas e ícones de classe) | [Lvl 3: 0/20]| (Abre/Fecha a Loja ฿)|
+-----------------------------------------------------------------------------------------------------+
```

### 2.2 Especificação Detalhada das Zonas (Fiel à Referência Visual)
1. **Arena Central (Perspectiva Isométrica)**:
   - Campo de batalha tático em ângulo isométrico 3/4 com iluminação e textura de piso.
   - Divisão transversal clara entre o campo do jogador (inferior-esquerdo) e campo inimigo/PvE (superior-direito).
   - Indicador visual flutuante do número de unidades em campo: `Unidades: X/Y` (ex: `2/3`).
2. **Painel Lateral Esquerdo (Lista Limpa de Comandantes / Lobby de 8 Jogadores)**:
   - Lista vertical exclusivamente dos 8 jogadores da partida (com o jogador humano destacado no topo com coroa/tag 'Você').
   - **Avatar, Nome, Nível e Barra de Vida do Player (não dos personagens)**.
   - Design 100% limpo, sem elementos de inventário ou botões misturados.
3. **Painel Lateral Direito (Menu de Opções & Container Multifuncional)**:
   - Borda com botões de alternância vertical:
     - **📋 Aba de Sinergias (Traits)**:
       - Lista vertical minimalista: ícone quadrado estilizado com o nome da sinergia ao lado (ex: Brigão, Paramecia, Espadachim, Chapéus de Palha).
       - Barrinhas/bloquinhos horizontais indicando a quantidade de peças para cada tier.
       - **Sinergias Inativas**: Ícone e blocos escuros/cinzas.
       - **Sinergias Ativas**: Ícone brilhante/colorido com os blocos do tier atingido preenchidos e iluminados.
       - **Interação**: Ao clicar no ícone/botão da sinergia, o próprio container é aproveitado para renderizar o modal/card com os detalhes e efeitos daquele bônus.
     - **🎒 Aba do Baú de Itens (Item Bag Vertical)**:
       - Transforma o container direito em uma bandeja vertical de inventário com moldura neon (exatamente como na imagem de referência).
       - Exibe os slots para guardar Chips de Sinergia, Orbes do Despertar e Itens de Combate.
       - Suporta arrastar e soltar (drag-and-drop) dos itens diretamente para as unidades no tabuleiro ou banco.
     - **⚔️ Aba de DPS & Métricas**:
       - Exibe gráficos de barras em tempo real de Dano Físico, Dano Mágico, Haki/Verdadeiro, Escudos e Cura por unidade.
4. **Cabeçalho Superior**:
   - **Canto Esquerdo**: Relógio global e indicador do Round atual (ex: `00:54` | `2º Round`).
   - **Centro**: Nome da Fase (`Fase de Batalha` / `Fase de Preparação`) com o **Timer Regressivo em destaque grande (ex: 43s)**.
5. **Rodapé Inferior**:
   - **Banco de Reservas (Bench)**: 8 slots dedicados para personagens de reserva (com exibição de estrelas 1★/2★/3★ e sinergias).
   - **Indicador de Nível e Barra de XP**: Mostra o nível atual e progresso (ex: `3 Nível - 0/20 XP`) com botão para Comprar XP (+4 XP por 4฿).
   - **Botão Retrátil da Loja de Beli (฿)**: Botão dourado destacado que abre/fecha o painel suspenso da loja de 5 cartas sem poluir a visão da arena durante o combate.

---

## 3. Ciclo de Rounds, Temporizadores e Regras de Combate

### 3.0 Temporizadores de Batalha e Regra dos 15 Segundos (Overtime 2X)
- **Duração Total da Batalha**: **1 minuto (60 segundos)** para todas as batalhas.
- **Regra de Aceleração 2X (Aos 15s Restantes)**:
  - Se o cronômetro atingir **15 segundos** e ainda não houver um vencedor, o jogo entra em estado de **Overtime (Frenesi)**:
    - A velocidade global de simulação, animações e velocidade de ataque de todas as unidades **aumenta para 2X**.
- **Regra de Empate (Ao Zerar o Tempo - 00s)**:
  - Se o cronômetro zerar (0s) sem que nenhum time tenha sido totalmente derrotado, a rodada é considerada **Empate (Draw)**.
  - **Penalidade de Empate**: Ambos os jogadores sofrem uma **quantidade reduzida de dano** em sua vida de Comandante (dano menor do que uma derrota direta, aplicando apenas o dano base da fase).

### 3.0 Início da Partida (Setup Inicial do Jogador)
- **Personagem Inicial Grátis**: Ao iniciar a partida, o jogador recebe imediatamente **1 Campeão Tier 1 Aleatório** no banco de reservas ou já posicionado no tabuleiro (Luffy, Nami, Usopp, Buggy ou Tashigi).
- **Economia Inicial**: Começa no Nível 1 com 2฿ para compras iniciais.

### 3.1 Cronograma Oficial de Progressão de Rounds (Round-by-Round)

A partida segue uma sequência de batalhas PvE (Marinha/Monstros), confrontos normais e fases de seleção de itens (Armory/Bônus):

| Round | Tipo de Batalha | Descrição & Eventos Especiais | Recompensas / Drops |
|---|---|---|---|
| **Round 1** | **PvE Inicial** | Enfrenta **2 Marinheiros Recrutas (Bots)** | Drop de Beli (฿) + 1 Campeão Tier 1 inicial no início |
| **Round 2** | **Combate Regular** | Batalha contra time oponente normal | Beli do round + Início da contagem de Streaks |
| **Round 3** | **Seleção de Item + Batalha** | **Fase Bônus**: Escolher 1 entre **2 Itens Aleatórios** (com direito a **1 Reroll/Refresh** gratuito) + Batalha contra oponente | 1 Item escolhido + Beli |
| **Round 4** | **Combate Regular** | Batalha contra time oponente | Beli + Juros |
| **Round 5** | **Combate Regular** | Batalha contra time oponente (pré-boss) | Beli + Juros |
| **Round 6** | **1º Boss PvE (Capitão da Marinha)** | **Batalha de Boss**: Enfrenta **1 Capitão da Marinha + 2 Marinheiros Armados**. Ao vencer, abre tela com **3 Itens para escolher 1 (sem refresh)** | 1 Item avançado/Chip + Beli |
| **Round 7** | **Combate Regular** | Batalha contra time oponente | Beli + Juros |
| **Round 8** | **Combate Regular** | Batalha contra time oponente | Beli + Juros |
| **Round 9** | **Seleção de Bônus + Batalha** | **Fase Bônus de Início de Fase**: Escolher 1 entre 2 itens/modificadores + Batalha contra oponente | 1 Item/Bônus + Beli |
| **Round 10+** | **Ciclo Contínuo** | Segue a lógica cíclica de batalhas normais, rounds bônus e bosses épicos (ex: Vice-Almirante, Almirante, Monstro Marinho/Rei dos Mares) | Drops de alto escalão |

### 3.2 As 3 Fases do Turno
1. **Fase de Preparação (15s)**:
   - Coleta de renda automática (Beli base + Juros + Bônus de Streak).
   - Atualização automática da loja.
   - Posicionamento livre de peças no grid e banco.
   - Equipamento, troca ou remoção de itens entre unidades e banco.
2. **Fase de Combate (30s - 40s)**:
   - Posições travadas e início do loop de combate automático.
   - Unidades selecionam alvos por proximidade, movimentam-se com física suave, atacam, geram mana e conjuram habilidades ao atingir 100 de mana.
   - **Regra de Itens em Combate**: Unidades em combate não podem ter itens removidos. Itens equipados durante a luta são fixados, mas seus efeitos só entram em vigor no próximo round.
   - **Overtime (aos 30s)**: Velocidade de ataque +100% e dano dobrado para finalização.
3. **Fase de Resolução (3s)**:
   - Identificação do vencedor.
   - Aplicação de dano ao comandante perdedor ($DanoBase + 1 \text{ por unidade viva}$).
   - Reset e regeneração das unidades para a próxima fase de preparação.

### 3.3 Economia de Beli (฿)
- **Renda Base por Round**: +5฿.
- **Juros (Interest)**: +1฿ a cada 10฿ guardados (máximo de +5฿ a partir de 50฿).
- **Sequência (Streak)**: +1฿ (2-3 rounds seguidos), +2฿ (4 rounds), +3฿ (5+ rounds).
- **Vitória no Round**: +1฿ imediato.

### 3.4 Tabela de Progressão de Nível, Limite de Unidades (Slots) e Recompensas Especiais

A capacidade máxima de unidades posicionadas no tabuleiro e as recompensas de nível seguem estritamente a tabela abaixo (respeitando o limite máximo de **6 unidades**):

| Nível do Jogador | XP Necessário | Limite de Unidades no Tabuleiro (Slots) | Recompensa Especial / Evento de Nível |
|---|---|---|---|
| **Nível 1** | 0 XP | **1 Unidade** (1 slot) | Início com 1 Campeão Tier 1 inicial grátis |
| **Nível 2** | 2 XP | **2 Unidades** (2 slots) | Acesso a novas compras na loja |
| **Nível 3** | 6 XP | **3 Unidades** (3 slots) | Abertura do Tier 3 na loja |
| **Nível 4** | 10 XP | **3 Unidades** (Mantém 3 slots) | 🔮 **1º Orbe do Despertar (Ultimate Core)** concedido gratuitamente no baú |
| **Nível 5** | 20 XP | **4 Unidades** (4 slots) | Abertura do Tier 4 na loja (2% de chance) |
| **Nível 6** | 36 XP | **5 Unidades** (5 slots) | Aumento substancial de Tier 3 e 4 na loja |
| **Nível 7** | 56 XP | **6 Unidades (Cap Máximo de Peças)** | Abertura do Tier 5 Lendário (1% de chance) |
| **Nível 8 (Máx)**| 80 XP | **6 Unidades** (Mantém o Cap Máx de 6) | 🔮 **2º Orbe do Despertar (Ultimate Core - Nível Máximo)** concedido no baú |

### 3.5 Tabela de Probabilidade da Loja por Nível (Shop Odds)
A loja oferece 5 cartas aleatórias a cada atualização, com chances de aparição de cada Tier baseadas no Nível do jogador:

| Nível do Jogador | Tier 1 (1฿) | Tier 2 (2฿) | Tier 3 (3฿) | Tier 4 (4฿) | Tier 5 (5฿) |
|---|---|---|---|---|---|
| **Nível 1** | 100% | 0% | 0% | 0% | 0% |
| **Nível 2** | 100% | 0% | 0% | 0% | 0% |
| **Nível 3** | 75% | 25% | 0% | 0% | 0% |
| **Nível 4** | 55% | 30% | 15% | 0% | 0% |
| **Nível 5** | 45% | 33% | 20% | 2% | 0% |
| **Nível 6** | 30% | 40% | 25% | 5% | 0% |
| **Nível 7** | 19% | 30% | 35% | 15% | 1% |
| **Nível 8 (Máx)**| 15% | 20% | 35% | 25% | 5% |

---

## 4. Motor de Combate (Matemática, Tipagem e Haki)

### 4.1 Tipos de Dano
1. **Dano Físico (Laranja)**: Escala com AD, reduzido pela Armadura ($Armor$).
2. **Dano Mágico (Azul/Roxo)**: Escala com AP/AD de acordo com o personagem (ex: Ace, Nami), reduzido pela Resistência Mágica ($MR$).
3. **Dano Verdadeiro / Haki (Branco)**: Ignora 100% de Armor e MR.

### 4.2 Fórmulas de Redução de Dano
$$\text{Dano Recebido} = \text{Dano Bruto} \times \left(\frac{100}{100 + \text{Resistência}}\right)$$

### 4.3 Mecânicas de Haki
- **Haki de Armamento (Busoshoku Haki)**: Converte uma porcentagem do dano em Dano Verdadeiro e perfura defesas de Logia/Akuma no Mi.
- **Haki do Rei (Haoshoku Haki)**: Pulso de Dano Psíquico em área com atordoamento (Stun) e desestabilização.
- **Haki de Observação (Kenbunshoku Haki)**: Concede chance de esquiva (Dodge) e precisão de ataque garantida.

### 4.4 Sistema de Habilidades por Estrelas (★) e Ataque Especial (Ultimate)
Cada personagem possui um conjunto de **3 Habilidades**:
1. **Ataque Básico**: Ataque contínuo conforme a velocidade de ataque (físico ou mágico).
2. **Habilidade Primária (Skill A)**: Desbloqueada nativamente na unidade de **1 Estrela (1★)**.
3. **Habilidade Secundária (Skill B)**: Desbloqueada quando a unidade atinge **2 Estrelas (2★)** ou **3 Estrelas (3★)**.
   - **Mecânica de Alternância**: Na fase de preparação, o jogador pode clicar na unidade (no tabuleiro ou banco) e escolher entre **Skill A** ou **Skill B** como habilidade ativa para o combate. Apenas uma habilidade normal pode ser usada em batalha por vez.
4. **Ataque Especial / Ultimate Lendário (Skill C - Special Attack)**:
   - Só pode ser conjurado por unidades de **2★ ou 3★**.
   - **Condição Estrita de Ativação**: Requer um **Item de Ativação Especial (ex: Orbe do Despertar / Núcleo Especial)** equipado no personagem.
   - **Limite Global da Partida (Teto de 2 Itens Especiais)**:
     - 1º Item Especial: Concedido ao jogador ao atingir o **Nível 4 de Comandante**.
     - 2º Item Especial: Concedido ao atingir o **Nível Máximo 8 de Comandante**.
     - Portanto, em toda a partida, no máximo **2 personagens** do time podem ter seu Ataque Especial ativado simultaneamente.

### 4.5 Sistema de Mana
- **Por Ataque Básico**: +10 de Mana.
- **Por Dano Recebido**: Fração proporcional ao dano sofrido (teto de 40 mana/hit).
- **Habilidade (Cast)**: Ao atingir 100 de mana, pausa o ataque básico, executa a habilidade ativa selecionada (ou o Especial, se o item estiver equipado) e zera a mana.

---

## 5. Elenco Oficial de Personagens por Tier com Árvore de Habilidades

### 5.1 Tabela Geral de Personagens

| Tier | Personagem | Custo | Tipo Ataque & Alcance | Sinergias | Habilidade Primária (1★ - Skill A) | Habilidade Secundária (2★ - Skill B) | Ataque Especial (Ultimate - Item Especial) |
|---|---|---|---|---|---|---|---|
| **Tier 1** | **Luffy** | 1฿ | Físico / Haki (Alcance 1) | Brigão, Paramecia | **Gomu Gomu no Pistol**: Soco direto frontal. (1★ pré-timeskip, 2★ multiplicador alto + braço preto Haki, 3★ Haki com chamas). | **Gomu Gomu no Bazooka**: Golpe duplo com palmas. Empurra 1 casa para trás e aplica confusão breve (0.02s). 3★ empurra 2 casas. | **Gear Second - Jet Bazooka**: Dash instantâneo no inimigo mais distante, causa dano colossal, empurra 3 casas (dano de impacto se bater no canto) e concede buff de velocidade/dano. |
| **Tier 1** | **Nami** | 1฿ | Mágico (Alcance 2) | Ladrão, Navegadora | **Thunder Tempo**: Rajada elétrica em alcance 2 causando dano mágico moderado e lentidão temporária. | **Cyclone Tempo**: Rajada de vento em área curta empurrando inimigos adjacentes 1 casa para trás. | **Tornado Tempo**: Tornado climático em linha reta que atravessa o campo causando dano mágico pesado e atordoamento. |
| **Tier 1** | **Usopp** | 1฿ | Físico (1★: Alc 3, 2★: Alc 4, 3★: Alc 5) | Atirador, Medroso | **Midori Boshi: Take Javelin**: 1★ Pimenta (dano físico e irritação reduzindo precisão). 2★/3★ Pop Green perfurante com Enraizamento de 1s. | **Midori Boshi: Devil**: Brota planta carnívora gigante no grid que morde inimigos causando dano contínuo e forçando distração. | **Hissatsu: Firebird Star**: Disparo sniper de pássaro de chamas que cruza o tabuleiro causando dano massivo e queimadura severa. |
| **Tier 1** | **Buggy** | 1฿ | Físico (Alcance 2) | Ladrão, Paramecia, Medroso | **Bara Bara Car**: Arremessa partes do corpo com facas à distância. (1★ facas básicas, 2★ mais velocidade e dano). | **Bara Bara Ho**: Bala de canhão guiada pelas mãos flutuantes. Dano em área pequena e desorientação leve. | **Bara Bara Festival**: Divide o corpo e ataca simultaneamente todos os oponentes vivos no tabuleiro (dano balanceado por alvo). |
| **Tier 1** | **Tashigi** | 1฿ | Físico (Alcance 1) | Espadachim, Marinha | **Kiri Shigure**: Golpe rápido com Shigure (1★ físico básico, 2★ precisão pós-timeskip, 3★ Haki do Armamento perfurando defesa). | **Ittoryu: Iai**: Saque veloz avançando 1 casa à frente que corta o alvo e causa mini-interrupt em conjurações. | **Shigure Sōten**: Dança de cortes em cruz que chovem sobre o inimigo causando dano massivo em alvo único e quebra de armadura. |
| **Tier 2** | **Zoro** | 2฿ | Físico / Haki (Alcance 1) [1★: 1 espada, 2★: 2 espadas, 3★: 3 espadas] | Brigão, Espadachim | **Onigiri**: Dash cortante rápido através/atrás do alvo com 3 espadas (1★ corte rápido, 2★ agressivo com sangramento/quebra de guarda). | **Tatsu Maki**: Gira com as 3 espadas criando um tornado de vento cortante que ergue e atordoa oponentes em área. | **San-Sen Seikai**: Consome barra total, avança cortando tudo em seu caminho com dano cinematográfico brutal e ignora defesa. |
| **Tier 2** | **Smoker** | 2฿ | Híbrido Físico/Mágico (Alcance 2 - Jitte) | Marinha, Logia | **White Blow**: Dispara punho de fumaça em linha reta (alcance 2), causando dano e empurrando o alvo para trás. (3★ dano/velocidade alta). | **White Snake**: Serpente de fumaça que persegue e se enrola no alvo mais próximo, causando dano contínuo, lentidão e Silêncio. | **White Out**: Cobre grande área com névoa densa. Inimigos sofrem sufocamento (dano mágico/s), perdem precisão (erram ataques) e enraízam. |
| **Tier 3** | **Sanji** | 3฿ | Físico (Alcance 1) | Brigão, Suporte | **Concasse**: Chute rápido focado em agilidade que causa dano físico direto e reduz a agilidade/ataque do alvo. | **Diable Jambe: Flanchet**: Gira até a perna incandescer, desferindo sequência veloz de chutes com dano físico e queimadura contínua. | **Diable Jambe: Mouton Shot**: Salto aéreo veloz caindo com saraivada brutal de chutes flamejantes e impacto massivo de fogo. |
| **Tier 3** | **Chopper** | 3฿ | Físico (Alcance 1) | Suporte, Zoan | **Brain Point: Scope**: Analisa o ponto fraco do inimigo mais próximo, causando dano leve e aumentando a chance de crítico dos aliados na mesma linha. | **Heavy Point / Walk Point Combo**: Transforma em Heavy Point desferindo soco pesado que afasta o inimigo 1 casa e causa lentidão. | **Monster Point**: Consome Rumble Ball e vira gigante, ganhando bônus massivo de vida temporária e pisoteando em área com dano colossal. |
| **Tier 3** | **Crocodile** | 3฿ | Mágico (Alcance 3) | Shichibukai, Logia | **Desert Spada / Gancho Venenoso**: Dispara 3 ganchos venenosos em até alcance 3, envenenando por 5s (30 dano/s) e reduzindo AD e AP em 30%. | **Ground Death**: Dreno vital causando 90% dano mágico no alvo à frente, desidratando por 5s (35 dano/s) e curando 40% do HP de Crocodile. | **Desert Giras**: Transforma o solo em areia movediça e lâminas cortantes globais, causando dano massivo em área, lentidão severa e auto-cura por alvo. |
| **Tier 4** | **Boa Hancock** | 4฿ | Mágico (Alcance 1) | Shichibukai, Crush, Paramecia | **Mero Mero Mello**: Feixe/flecha de corações perfurante causando dano mágico e petrificando o alvo (Stun de 500ms). | **Slave Arrow**: Dispara saraivada de flechas de coração em cone frontal causando dano mágico e petrificação/lentidão em grupo. | **Perfume Femur**: Sequência de chutes letais petrificando áreas tocadas, com dano massivo e animação virando as costas com desdém. |
| **Tier 4** | **Momonosuke** | 4฿ | Híbrido Físico/Mágico (Alcance 2) | Espadachim, Zoan Mítica, Dragão | **Boro Breath**: Feixe concentrado de fogo em linha reta causando dano mágico e queimadura. (3★ destrói parte da defesa mágica). | **Kumo no Hado**: Cria nuvens de chamas saltando por cima de casas até local seguro, deixando fogo no solo que queima inimigos. | **Kazan Boro Breath**: Ruge e libera Boro Breath colossal em cone gigantesco, causando dano devastador e queimadura prolongada. |
| **Tier 5** | **Shanks** | 5฿ | Dano Puro / Haki (Alcance 1) | Espadachim, Haki da Observação, Haki do Rei | **Kamusari (Divina Partida)**: Dash inegável instantâneo com Gryphon desferindo corte com Haki do Rei, causando dano puro em linha reta e empurrando inimigos. | **Gryphon Strike**: Antecipa golpe com Haki da Observação, desvia no limite e contragolpeia com Haki do Armamento (Stun 1s + Crítico garantido). | **Haoshoku Haki: Supressão Absoluta**: Onda avassaladora cobrindo o tabuleiro. Inimigos de menor tier/HP sofrem Stun imediato, drenagem de mana e dano puro contínuo; aliados ganham buff massivo de moral, velocidade e crítico. |

---

## 6. Sinergias Oficiais & Sistema de Chips/Emblemas

### 6.1 Sinergia: Brigão (Brawler / Combate)
Unidades drenam HP ao causar dano e cada ataque básico aumenta a velocidade de ataque acumulativamente durante o combate.
- **Membros**: Luffy (Tier 1), Zoro (Tier 2), Sanji (Tier 3).
- **(2) Brigão**: +25% Roubo de Vida, +15% Velocidade de Ataque cumulativa.
- **(3) Brigão**: +35% Roubo de Vida, +20% Velocidade de Ataque cumulativa.
- **(4) Brigão**: +40% Roubo de Vida, +25% Velocidade de Ataque cumulativa.
- **(5) Brigão**: +50% Roubo de Vida, não aumenta mais velocidade de ataque, mas o **Dano Básico sobe +340%** e garante **100% de Acerto Crítico**.
- **(6) Brigão**: +60% Roubo de Vida e ataques básicos causam **Dano Colossal em Grande Área (AOE Cleave)** ao redor do alvo.

### 6.2 Sinergias de Classe e Origem do Elenco
1. **Medroso (Usopp, Buggy)**:
   - **(2)**: Quando na iminência de sofrer um golpe direto, possuem 35% de chance de dar um salto/passo para trás (1 casa), esquivando do golpe e reposicionando-se com segurança.
2. **Crush (Boa Hancock)**:
   - **(1)**: Personagens masculinos ou com traços cômicos/tarados (ex: Sanji) têm seu dano causado contra a unidade reduzido em 50% devido à sua extrema beleza.
3. **Espadachim (Tashigi, Zoro, Momonosuke, Shanks)**:
   - **(2)**: 30% de chance de desferir um ataque duplo extra.
   - **(4)**: 65% de chance de ataque duplo extra e ignora 20% da armadura do alvo.
4. **Paramecia (Luffy, Buggy, Boa Hancock)**:
   - **(2)**: +25% de resistência a dano contínuo e ganho de +15 de mana inicial.
5. **Logia (Smoker, Crocodile)**:
   - **(2)**: 20% de chance de intangibilidade (ataques físicos erram completamente sem causar dano).
6. **Zoan / Zoan Mítica (Chopper, Momonosuke)**:
   - **(2)**: Ao sofrer dano fatal pela primeira vez, regeneram 40% da vida máxima e ganham +30% de dano.
7. **Marinha (Tashigi, Smoker)**:
   - **(2)**: Unidades ganham +30 de Armadura e +30 de Resistência Mágica.
8. **Shichibukai (Crocodile, Boa Hancock)**:
   - **(2)**: Inimigos atingidos por habilidades sofrem redução permanente de 20% em suas curas e escudos.
9. **Ladrão / Navegadora (Nami, Buggy)**:
   - **(2)**: Ao vencer o round, chance de 50% de saquear +1฿ extra do oponente.
10. **Haki da Observação & Haki do Rei (Shanks)**:
    - **(1)**: Ataques nunca erram e ataques causam Dano Puro contínuo ignorando 100% das defesas.

### 6.3 Sistema de Chips de Sinergia e Itens Especiais (Itemization)
- **🥊 Chip de Luta**: Concede +1 ponto de sinergia Brigão. **Restrição**: Equipável apenas em unidades que já pertencem à classe Brigão (Luffy, Zoro, Sanji).
- **⚔️ Chip de Espadachim**: Concede +1 ponto de sinergia Espadachim. Equipável em espadachins.
- **🔥 Chip de Logia / 🐾 Chip de Zoan / 🌀 Chip de Paramecia**: Concedem +1 ponto para a respectiva classe.
- 🔮 **Orbe do Despertar / Item de Ativação Especial (Ultimate Core)**:
  - **Efeito**: Desbloqueia o **Ataque Especial Lendário (Skill C)** do personagem equipado, substituindo a conjuração regular de 100 de mana pelo seu Ultimate cinematográfico de alto impacto.
  - **Requisito do Campeão**: O personagem precisa ter pelo menos **2★ ou 3★**.
  - **Disponibilidade Estrita**: Apenas **2 unidades desse item** são fornecidas na partida inteira:
    - 1º Orbe concedido ao atingir o **Nível 4**.
    - 2º Orbe concedido ao atingir o **Nível 8 (Nível Máximo)**.

---

## 7. Roadmap de Implementação Modular

1. **Fase 1 — Dados & Motor Puro (Core)**:
   - `src/types/game.ts` (Modelos e Enums).
   - `src/data/units.ts`, `src/data/synergies.ts`, `src/data/items.ts`.
   - `src/engine/damage.ts`, `src/engine/targeting.ts`, `src/engine/combatSimulator.ts`.
2. **Fase 2 — Tabuleiro & Renderizador Gráfico**:
   - `src/components/Board.tsx` (Renderização de arena, animações de combate, projéteis, barras de vida/mana).
   - `src/components/Bench.tsx` & `src/components/ItemBag.tsx`.
3. **Fase 3 — Painéis de Controle, Loja & Estatísticas**:
   - `src/components/Shop.tsx`, `src/components/SynergyTracker.tsx`, `src/components/CombatStats.tsx`.
   - `src/components/DebugControls.tsx` (Controle de velocidade 1x/2x/4x, reset, forçar início).
