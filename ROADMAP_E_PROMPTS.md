# One Piece Tactics: Roadmap e Guia de Implementacao

## Indice

1. [Objetivo deste documento](#1-objetivo-deste-documento)
2. [Estado atual do projeto](#2-estado-atual-do-projeto)
3. [Decisoes de escopo](#3-decisoes-de-escopo)
4. [Ordem recomendada de execucao](#4-ordem-recomendada-de-execucao)
5. [Backlog prioritario](#5-backlog-prioritario)
6. [Pipeline de modelos e animacoes](#6-pipeline-de-modelos-e-animacoes)
7. [Plano para o notebook atual](#7-plano-para-o-notebook-atual)
8. [Multiplayer entre amigos](#8-multiplayer-entre-amigos)
9. [Criterios de pronto](#9-criterios-de-pronto)
10. [Como pedir implementacoes a uma IA](#10-como-pedir-implementacoes-a-uma-ia)
11. [Prompts reutilizaveis](#11-prompts-reutilizaveis)
12. [Regras de seguranca do projeto](#12-regras-de-seguranca-do-projeto)

---

## 1. Objetivo deste documento

Este arquivo funciona como um mapa de desenvolvimento para o MVP de **One Piece Tactics**. Ele deve ajudar a decidir o que fazer primeiro, reduzir retrabalho e transformar pedidos futuros para uma IA em tarefas pequenas e verificaveis.

O objetivo imediato nao e criar o jogo online completo. E construir uma partida local completa, divertida e estavel, que possa ser empacotada para EXE e APK antes de adicionar a complexidade de rede.

---

## 2. Estado atual do projeto

### 2.1 Base tecnica

- React 19 + TypeScript + Vite.
- Three.js para modelos 3D, camera, mixers e animacoes.
- Tailwind CSS e componentes React para a interface.
- Electron Builder para EXE Windows.
- Capacitor para Android.
- GLB/GLTF como formato principal de runtime.
- FBX usado como formato intermediario em parte do pipeline.

### 2.2 Sistemas que ja existem

- Ciclo de preparacao, combate e resolucao de rounds.
- Economia de Beli, juros, streak, XP, nivel e limite de unidades.
- Loja, refresh, compra, venda e lock.
- Banco de unidades com 8 espacos.
- Posicionamento por grid e drag-and-drop.
- Combate em tempo real com alvo, movimento, ataques, mana e habilidades.
- Tipos de dano, defesa, Haki, sinergias e itens.
- Bots com arquétipos, temas e dificuldade.
- Rounds PvE, bosses, draft de itens e tela de game over.
- Painel de teste de animacoes.
- Preload e cache de modelos 3D.
- Retarget de nomes de ossos entre rigs.
- Armas procedurais para alguns personagens.
- Build para EXE e configuracao Android em modo landscape.

### 2.3 Arquivos que concentram as decisoes atuais

- `src/App.tsx`: orquestracao do ciclo principal e grande parte do estado da partida.
- `src/engine/combatEngine.ts`: inicializacao e simulacao dos ticks de combate.
- `src/engine/botAI.ts`: adversarios, arquétipos e encontros PvE.
- `src/engine/botStateManager.ts`: estado dos bots por round.
- `src/utils/gameUtils.ts`: economia, nivel, loja, unidades e sinergias.
- `src/utils/modelPreloader.ts`: carregamento, cache, retarget e catalogo de ativos 3D.
- `src/components/Champion3DModel.tsx`: cena Three.js individual, camera e transicoes de animacao.
- `src/data/units.ts`, `src/data/items.ts`, `src/data/synergies.ts`: dados de conteudo.
- `src/types/game.ts`, `src/types/combat.ts`: contratos de dados.
- `PRD.md`: regras desejadas e visao do produto.

### 2.4 Diagnostico importante

O projeto ja esta alem de um prototipo visual, mas ainda e um sandbox local. O PRD descreve uma arquitetura mais separada do que a implementacao atual: por exemplo, ele cita `combatSimulator.ts`, enquanto o motor presente esta em `combatEngine.ts`. Isso nao e um problema que precise ser corrigido agora; significa apenas que o PRD deve ser tratado como direcao, e o codigo atual como fonte da verdade durante cada implementacao.

Tambem existe uma diferenca entre as regras escritas e alguns valores iniciais no codigo. Exemplos devem ser tratados por testes e uma tabela de regras canonica, nao por alteracoes aleatorias em varios componentes.

---

## 3. Decisoes de escopo

### 3.1 Escopo do primeiro MVP jogavel

O primeiro MVP deve permitir:

1. Iniciar uma partida sem login.
2. Comprar e vender unidades.
3. Posicionar unidades no tabuleiro e no banco.
4. Formar pelo menos algumas sinergias.
5. Assistir a um combate completo.
6. Ganhar ou perder vida de comandante.
7. Receber Beli, XP e itens.
8. Avancar por varios rounds.
9. Chegar a game over ou reiniciar a partida.
10. Rodar de forma aceitavel no navegador, EXE e Android de teste.

### 3.2 O que nao deve ser prioridade agora

- Login e contas permanentes.
- Ranking global.
- Loja de monetizacao.
- Oito jogadores reais simultaneos.
- Dezenas de ultimates cinematograficos.
- Criar um modelo 3D exclusivo para cada unidade.
- Refatorar toda a aplicacao de uma vez.

### 3.3 Escolha de plataforma

Continue usando React/TypeScript/Three.js. A conversao para EXE e APK reaproveita a maior parte da aplicacao, mas nao corrige automaticamente problemas de desempenho. A qualidade final dependera de memoria, quantidade de modelos, tamanho de texturas, numero de mixers e complexidade da cena.

---

## 4. Ordem recomendada de execucao

### Fase 0 - Higiene e medicao

**Objetivo:** tornar o desenvolvimento previsivel no notebook atual.

- Liberar espaco em disco antes de novos builds.
- Definir uma pasta externa ou nuvem para FBX, arquivos Blender e exportacoes antigas.
- Criar uma lista canonica de unidades e ativos realmente usados no MVP.
- Medir tempo de build, tempo de preload e memoria durante uma partida.
- Rodar `npm run lint` antes de cada grupo de mudancas.

**Pronto quando:** existe espaco livre confortavel, o build e repetivel e os tempos de carregamento foram anotados.

### Fase 1 - Contrato de regras

**Objetivo:** impedir que a mesma regra tenha valores diferentes em arquivos diferentes.

- Escolher a fonte oficial entre PRD e codigo para cada regra.
- Consolidar duracao de preparacao, combate e overtime.
- Consolidar ouro inicial, XP, slots, juros, streak e dano de round.
- Consolidar tiers, custos, chances da loja e limites de estrelas.
- Definir uma tabela de casos de teste para economia e combate.

**Pronto quando:** uma alteracao de balanceamento exige mudar um ponto principal, e os valores essenciais possuem testes ou verificacao clara.

### Fase 2 - Partida local completa

**Objetivo:** validar a diversao e a compreensao do jogo antes do multiplayer.

- Garantir que o round 1 sempre seja jogavel.
- Validar compra, venda, refresh, lock e combinacao de estrelas.
- Validar posicionamento, limite de slots e retorno ao banco.
- Validar transicao entre todos os estados de round.
- Validar vitoria, derrota, empate, dano e game over.
- Permitir reiniciar uma partida sem recarregar a pagina.

**Pronto quando:** uma partida pode ser iniciada, jogada e encerrada sem precisar de controles de debug.

### Fase 3 - Estabilidade do combate

**Objetivo:** fazer o resultado ser confiavel e a animacao acompanhar a simulacao.

- Separar claramente estado de combate e estado visual.
- Garantir que `deltaSeconds` nao dependa da velocidade do computador.
- Testar alvo, alcance, morte, stun, knockback, mana e overtime.
- Verificar que unidades mortas deixam de atacar e de receber eventos.
- Validar que o resultado permanece igual em velocidades 1x e 2x, salvo tempo visual.
- Registrar eventos importantes para depuracao: ataque, dano, cast, morte e fim.

**Pronto quando:** o mesmo setup produz o mesmo resultado logico em repeticoes equivalentes.

### Fase 4 - Desempenho 3D

**Objetivo:** fazer o jogo caber no notebook e em celulares modestos.

- Nao bloquear a tela inicial carregando todos os ativos de uma vez.
- Carregar primeiro os modelos do round atual.
- Usar cache e descarregar ativos que nao serao usados.
- Reduzir materiais, texturas, bones e clips desnecessarios.
- Reaproveitar animacoes entre personagens com rigs compativeis.
- Adicionar niveis de detalhe ou fallback visual quando necessario.
- Evitar criar uma cena Three.js pesada para elementos que poderiam ser 2D.

**Pronto quando:** a arena abre sem travar, o preload tem progresso real e uma batalha com o limite do MVP permanece responsiva.

### Fase 5 - EXE e APK de teste

**Objetivo:** validar o produto nos formatos que sua familia usara.

- Gerar o EXE Windows em uma maquina limpa quando possivel.
- Testar abrir, jogar, fechar e reabrir.
- Gerar APK debug com Capacitor.
- Testar instalacao, orientacao landscape, toque e drag-and-drop.
- Testar aparelho Android real, nao apenas o emulador.
- Registrar falhas especificas de Windows, navegador e Android.

**Pronto quando:** o mesmo MVP pode ser jogado nos tres ambientes sem bloqueio critico.

### Fase 6 - Multiplayer entre amigos

**Objetivo:** adicionar salas privadas sem comprometer as regras do jogo.

- Criar um servidor autoritativo simples.
- Criar sala por codigo ou link.
- Sincronizar lobby, jogadores e estado de preparacao.
- Enviar apenas comandos do jogador, nao resultados confiaveis do cliente.
- Simular o combate no servidor ou validar seus eventos no servidor.
- Adicionar reconexao e tratamento de abandono.

**Pronto quando:** dois ou mais jogadores conseguem entrar na mesma sala, preparar seus times e receber o mesmo resultado de round.

---

## 5. Backlog prioritario

### P0 - Fazer antes de crescer o conteudo

- [ ] Liberar espaco do disco e organizar ativos brutos.
- [ ] Rodar lint e corrigir apenas erros que bloqueiam o build.
- [ ] Fechar regras conflitantes entre PRD e codigo.
- [ ] Validar uma partida local completa.
- [ ] Testar reinicio da partida.
- [ ] Criar uma lista de ativos do MVP.
- [ ] Medir preload e memoria.
- [ ] Testar EXE e APK debug com o mesmo build.

### P1 - Melhorar a experiencia do MVP

- [ ] Melhorar loading progressivo de modelos.
- [ ] Corrigir animacoes faltantes por personagem com fallback consistente.
- [ ] Garantir feedback visual para ataque, dano, mana e habilidade.
- [ ] Adicionar testes para economia, loja, nivel e dano.
- [ ] Adicionar configuracao de qualidade grafica.
- [ ] Salvar logs de diagnostico sem poluir a interface.
- [ ] Criar uma tela simples de configuracoes para reduzir efeitos em celulares.

### P2 - Conteudo e multiplayer

- [ ] Criar mais unidades somente depois da base estar estavel.
- [ ] Criar itens e sinergias com testes de balanceamento.
- [ ] Criar servidor de salas.
- [ ] Adicionar reconexao.
- [ ] Adicionar convite por codigo.
- [ ] Adicionar persistencia apenas quando houver necessidade real.

---

## 6. Pipeline de modelos e animacoes

### Fluxo recomendado

`Tripo -> Blender -> Mixamo -> Blender -> GLB otimizado -> public/models -> preload seletivo -> Three.js`

### Regras praticas

- Manter o arquivo original do Tripo fora do build do jogo.
- Usar Blender para limpar objetos, materiais, escala, origem e nomes.
- Usar um rig comum quando o personagem permitir.
- Exportar apenas as animacoes necessarias para a unidade.
- Renomear clips de forma previsivel: `idle`, `walk`, `attack`, `cast`, `death`.
- Verificar nomes dos ossos antes do retarget.
- Remover cameras, lights, meshes de teste e objetos auxiliares.
- Preferir uma textura pequena bem usada a varias texturas grandes.
- Manter uma versao de qualidade reduzida para Android.
- Testar cada GLB isoladamente antes de coloca-lo no catalogo global.

### Uso das moedas do Tripo

Priorizar modelos que definem a identidade do MVP. Para personagens secundarios, usar variacoes de materiais, armas procedurais, retratos e efeitos. O jogador precisa reconhecer a funcao da unidade; nao e necessario que cada unidade tenha um modelo unico de alta complexidade.

### Regra de desempenho

O modelo final deve ser avaliado pelo custo dentro da batalha, nao apenas pela aparencia no Blender. Um personagem bonito que aumenta muito o preload ou derruba o FPS pode ser pior para o jogo do que um modelo mais simples e legivel.

---

## 7. Plano para o notebook atual

O equipamento informado possui i5-1135G7, 8 GB de RAM, Intel Iris Xe e aproximadamente 238 GB de armazenamento, com cerca de 231 GB usados.

### Ordem de economia de recursos

1. Liberar armazenamento antes de baixar ou exportar novos lotes.
2. Fechar navegador e aplicativos pesados ao usar Blender.
3. Trabalhar com poucos modelos abertos por vez.
4. Usar texturas de 512 ou 1024 pixels no MVP.
5. Evitar preloads de todo o elenco.
6. Fazer builds somente quando houver uma mudanca pronta para validar.
7. Guardar fontes e backups em armazenamento externo ou nuvem.

O objetivo nao e transformar o notebook em uma maquina de producao 3D. E manter o ciclo editar, testar e medir funcionando.

---

## 8. Multiplayer entre amigos

O multiplayer deve vir depois da partida local porque adiciona problemas diferentes: latencia, reconexao, autoridade, abandono e seguranca.

### Arquitetura minima futura

- Cliente React/Three.js: interface, entrada do jogador e renderizacao.
- Servidor: salas, regras, validacao e estado oficial.
- Transporte: WebSocket ou biblioteca equivalente.
- Sala privada: codigo curto para os amigos entrarem.
- Comandos: comprar, vender, posicionar, equipar, refresh e pronto.
- Servidor: valida saldo, slots, itens, turnos e resultados.

Nunca confiar no cliente para decidir ouro, dano, vitoria, item recebido ou resultado de combate. O cliente pode solicitar uma acao; o servidor aceita ou rejeita.

### Primeira versao online recomendada

Comecar com 2 jogadores em sala privada e rounds sincronizados. Nao iniciar com oito jogadores, contas, ranking ou matchmaking. O objetivo inicial e provar que duas pessoas conseguem preparar seus times e assistir ao mesmo combate.

---

## 9. Criterios de pronto

Uma tarefa so deve ser considerada concluida quando:

- O comportamento pedido funciona no fluxo normal.
- O caso de erro mais provavel foi tratado.
- O tipo TypeScript esta correto.
- O codigo nao depende de um estado antigo em timers ou callbacks.
- O build ou teste correspondente foi executado.
- A alteracao nao quebrou o fluxo de uma partida existente.
- A performance foi observada quando a tarefa envolve 3D.
- A documentacao foi atualizada se uma regra mudou.

### Comandos base

```powershell
npm run lint
npm run build
npm run electron:build
npm run android:sync
npm run android:apk
```

Executar somente o comando adequado ao escopo da tarefa. Nao gerar EXE e APK a cada pequena alteracao.

---

## 10. Como pedir implementacoes a uma IA

Pedidos bons devem conter:

1. O resultado observavel desejado.
2. O arquivo ou modulo responsavel.
3. O que nao pode ser alterado.
4. As regras exatas.
5. O criterio de aceite.
6. O comando de validacao.

Evite pedir: "implemente todo o multiplayer" ou "melhore todas as animacoes". Prefira uma fatia pequena, como: "adicione o estado de reconexao da sala e teste os tres estados: conectado, reconectando e desconectado".

### Fluxo de trabalho para cada pedido

1. Pedir para a IA ler os arquivos envolvidos.
2. Pedir um diagnostico curto antes da edicao.
3. Autorizar uma mudanca pequena.
4. Executar lint, build ou teste focado.
5. Jogar o fluxo manualmente.
6. So entao passar para a proxima tarefa.

---

## 11. Prompts reutilizaveis

### 11.1 Diagnostico antes de editar

```text
Leia apenas os arquivos envolvidos nesta tarefa: [LISTA DE ARQUIVOS].
Nao edite nada ainda.
Explique qual modulo controla o comportamento, qual e a causa mais provavel do problema e qual e o menor teste que pode confirmar essa hipotese.
Respeite os tipos e padroes ja usados no projeto.
```

### 11.2 Implementacao pequena

```text
Implemente somente esta mudanca: [DESCRICAO EXATA].

Arquivos permitidos: [LISTA].
Nao altere outros comportamentos, layout ou regras.
Preserve a API publica existente e o estilo atual.
Depois da edicao, execute: [COMANDO].
Se a validacao falhar, corrija apenas a causa relacionada a esta tarefa.
Ao final, informe os arquivos alterados e o resultado da validacao.
```

### 11.3 Otimizacao de GLB

```text
Analise o carregamento do ativo [NOME/URL] e o componente [ARQUIVO].
O objetivo e reduzir memoria e tempo de carregamento sem mudar a aparencia essencial nem quebrar idle, walk, ataque e death.
Primeiro identifique o maior custo mensuravel.
Depois faca a menor mudanca possivel e valide com build.
Nao remova animacoes sem listar quais foram preservadas.
```

### 11.4 Teste de regra de jogo

```text
Crie uma verificacao focada para esta regra: [REGRA].
Use os tipos e funcoes existentes.
Cubra pelo menos: caso normal, limite inferior, limite superior e uma entrada invalida.
Nao altere o balanceamento.
Execute o teste ou lint e mostre o resultado.
```

### 11.5 Multiplayer futuro

```text
Implemente somente a primeira fatia de uma sala privada para 2 jogadores: [FATIA].
O servidor deve ser a autoridade sobre [REGRAS].
O cliente pode apenas enviar comandos e renderizar o estado aceito.
Inclua estados de conectado, reconectando e desconectado.
Nao implemente ranking, contas, matchmaking ou oito jogadores nesta tarefa.
Liste o protocolo de mensagens e valide o fluxo principal.
```

### 11.6 Revisao de codigo

```text
Revise [ARQUIVOS] procurando primeiro bugs, estados inconsistentes, vazamentos de recursos, problemas de performance e ausencia de validacao.
Nao faca refatoracao estetica.
Liste os achados por severidade com caminho do arquivo, causa, impacto e teste sugerido.
Se nao houver problema, informe os riscos residuais e as lacunas de teste.
```

---

## 12. Regras de seguranca do projeto

- Nao fazer grandes refatoracoes durante uma tarefa de conteudo.
- Nao misturar multiplayer, animacao e balanceamento no mesmo pedido.
- Nao apagar ativos antigos sem confirmar que nao sao usados.
- Nao confiar apenas no preview do Blender; testar dentro do jogo.
- Nao aceitar uma resposta de IA sem compilar e jogar o fluxo alterado.
- Nao adicionar novos modelos antes de medir o custo dos atuais.
- Nao deixar regras importantes espalhadas em componentes visuais.
- Nao usar o cliente como autoridade quando o multiplayer existir.
- Manter o PRD atualizado quando uma regra for oficialmente alterada.
- Fazer backup antes de mudancas grandes em modelos, animacoes ou build.

## Proxima tarefa recomendada

Comecar pela **Fase 0**: liberar armazenamento, organizar os ativos e medir o preload atual. Em seguida, validar uma partida local completa do round 1 ao game over. Essas duas verificacoes vao mostrar se o proximo investimento deve ser em regras, desempenho 3D ou experiencia de jogo.