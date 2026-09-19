# PRD & Roteiro de Implementação: Multiplayer Online & Otimização Mobile (PWA)

Este documento contém os requisitos de produto (PRD), a arquitetura técnica e o plano de execução passo a passo para transformar o **One Piece Tactics** em um jogo **Multiplayer Online em Tempo Real** com suporte completo a **Dispositivos Móveis (PWA / Touch)**.

---

## 1. Visão Geral do Produto (PRD)

- **Objetivo**: Permitir que até 8 jogadores reais entrem em uma mesma partida simultânea via navegador (desktop e celular), com sincronização de relógio de fases, pool compartilhado de campeões (bag de peças), matchmaking de combates 1v1 com espelhamento de tabuleiros e preenchimento com bots para vagas ausentes.
- **Plataformas**: Navegadores Web Desktop e Navegadores Mobile (Android/iOS via PWA em tela cheia).

---

## 2. Pilares Arquiteturais

### A. Backend Autoritativo de Salas & Sockets
- **Tecnologia recomendada**: Node.js / Express integrado com `Socket.io` ou `ws` (WebSockets).
- **Responsabilidades do Servidor**:
  1. **Lobby & Salas**: Criação de salas via código de convite (ex: `ROOM-7X9A`) ou fila aberta para 8 jogadores.
  2. **Relógio Centralizado do Jogo**: O servidor dita o tempo oficial da Fase de Preparação (30s), Fase de Warmup (3s) e Fase de Combate (35s), transmitindo os ticks para os clientes.
  3. **Pool Compartilhado de Peças**: Controle do número total de cópias de cada personagem (ex: Tiers 1, 2, 3, 4 e 5 têm limites de cópias na partida). Compras e vendas atualizam o pool comum.
  4. **Sincronização de Tabuleiro e Matchmaking**:
     - No início de cada fase de combate, cada cliente envia o snapshot do seu tabuleiro (unidades, posições, itens, estrelas, buffs).
     - O servidor executa o sorteio de confrontos (pares 1v1 ou combate fantasma caso número ímpar) e despacha o snapshot do oponente para cada jogador.
  5. **Resolução de Dano & Vida**: O resultado das lutas é validado e sincronizado, atualizando o HP dos 8 comandantes no placar oficial.

### B. Suporte Mobile & PWA
- **Tecnologias**: Web App Manifest (`manifest.json`), Service Worker com cache de assets 3D, Meta tags de viewport e orientação.
- **Responsabilidades do Cliente Mobile**:
  1. **PWA (Instalável)**: Ícone na tela inicial, modo `display: standalone` (sem barra de navegação do browser) e orientação forçada em paisagem (`orientation: landscape`).
  2. **Interações Touch Nativas**:
     - Suporte a `touchstart`, `touchmove`, `touchend` e `pointer events` no tabuleiro Three.js e no banco de reservas.
     - Prevenção de gestos do navegador como "pull-to-refresh" e zoom de pinça durante o jogo (`touch-action: none`).
  3. **UI Responsiva Compacta**:
     - Adaptação dos botões de comprar XP, roletar loja e banco de itens para telas de celulares e tablets.

---

## 3. Fases de Execução (Roteiro para o Agente)

### Fase 1: Suporte Mobile e Controles por Toque (Client-Side)
1. **PWA Configuration**:
   - Criar `public/manifest.json` com nome, cores de tema, orientação landscape e ícones.
   - Atualizar `index.html` com as tags `<link rel="manifest">`, `<meta name="mobile-web-app-capable" content="yes">` e tags iOS `<meta name="apple-mobile-web-app-capable">`.
2. **Camada de Entrada Touch no Tabuleiro**:
   - Ajustar o sistema de drag-and-drop em `App.tsx` e `BoardCanvas.tsx` para mapear toques na tela (Touch / Pointer Events) exatamente como cliques de mouse, garantindo que arrastar unidades e itens funcione fluidamente no celular.
   - Adicionar estilos CSS globais `touch-action: manipulation; user-select: none;` para evitar zooms acidentais.

### Fase 2: Servidor de Sockets e Gerenciamento de Salas
1. **Configuração do Servidor (`server.ts`)**:
   - Inicializar `socket.io` acoplado ao servidor HTTP Express já existente na porta 3000.
2. **Estrutura de Dados do Servidor (`server/roomManager.ts`)**:
   - `Room`: id da sala, lista de jogadores (máx 8), status (`WAITING`, `IN_GAME`, `FINISHED`), estado dos bots para vagas vazias.
3. **Eventos de Rede Base**:
   - `c2s_join_room` / `s2c_room_state`: Entrada no lobby e lista de jogadores conectados.
   - `c2s_start_game`: Início da partida (preenchimento automático com bots se < 8 jogadores).
   - `s2c_phase_tick`: Cronômetro oficial da fase atual emitido a cada segundo pelo servidor.

### Fase 3: Economia Compartilhada & Sincronização de Tabuleiro
1. **Pool Compartilhado de Campeões**:
   - Servidor mantém a quantidade restante de cada carta.
   - Eventos `c2s_buy_card` e `c2s_sell_card` deduzem e devolvem cópias para a bolsa comum de peças.
2. **Despacho de Tabuleiros para Combate**:
   - Ao encerrar a Fase de Preparação, cada cliente emite `c2s_submit_board` com as coordenadas e estados das suas unidades.
   - Servidor calcula o matchmaking da rodada e responde com `s2c_start_combat`, enviando a cada cliente as unidades e itens do adversário que ele enfrentará.

### Fase 4: Resolução de Dano, Placar e Reconexão
1. **Sincronização de Vida e Derrotas**:
   - Cliente reporta o término do combate (`c2s_combat_result`).
   - Servidor atualiza o HP dos comandantes e transmite `s2c_leaderboard_update`.
2. **Tolerância a Desconexões (Reconnection)**:
   - Se o jogador cair ou atualizar a aba no celular, ao reabrir a página ele deve reconectar ao socket com o mesmo token/ID e recuperar seu ouro, tabuleiro e banco.

---

## 4. Checklist para o Agente Futuro

Quando solicitado para implementar este documento, o agente deve seguir esta ordem:
- [ ] Ler este documento integralmente (`MULTIPLAYER_MOBILE_PRD.md`).
- [ ] Instalar dependências necessárias (ex: `socket.io` e `socket.io-client`).
- [ ] Configurar o PWA e testar os eventos de toque na arena e no banco.
- [ ] Implementar a camada de servidor Socket.io com gerenciamento de salas e bots de fallback.
- [ ] Adaptar o `App.tsx` para sincronizar o estado local com os eventos do servidor.
- [ ] Executar o linter e o build (`compile_applet`) garantindo que nenhum erro de tipagem ocorra.
