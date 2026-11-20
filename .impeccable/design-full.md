---
name: youtoba
description: Faxina de playlists do YouTube com pegada de grafite; a tinta cinza cobre o que sai.
colors:
  bg: "#ecebe6"
  bg-dark: "#0e0f13"
  surface: "#ffffff"
  surface-dark: "#16171d"
  surface-2: "#f4f3ef"
  surface-2-dark: "#1d1f27"
  line: "#d6d4cc"
  line-dark: "#2a2c36"
  fg: "#131318"
  fg-dark: "#f2f0ea"
  muted: "#5c5d68"
  muted-dark: "#a2a4b0"
  accent: "#c70f62"
  accent-dark: "#ff3d93"
  accent-hover: "#a90c53"
  accent-hover-dark: "#ff62a8"
  accent-fg: "#ffffff"
  accent-fg-dark: "#14060d"
  spray: "#e4167a"
  spray-dark: "#ff3d93"
  buff: "#bdb9ae"
  buff-dark: "#3b3c45"
  buff-streak: "#aeaa9e"
  buff-streak-dark: "#45464f"
  ok: "#157a4c"
  ok-dark: "#43d69b"
  warn: "#7a4f00"
  warn-dark: "#ffc83d"
  warn-soft: "#ffc83d33"
  warn-soft-dark: "#ffc83d1f"
  danger: "#b3261e"
  danger-dark: "#ff6b6b"
  danger-soft: "#b3261e14"
  danger-soft-dark: "#ff6b6b1a"
typography:
  display:
    fontFamily: "Big Shoulders Display, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(96px, 14vw, 168px)"
    fontWeight: 900
    lineHeight: 0.82
  headline:
    fontFamily: "Big Shoulders Display, Arial Narrow, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.005em"
  title:
    fontFamily: "Big Shoulders Display, Arial Narrow, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.005em"
  numeral:
    fontFamily: "Big Shoulders Display, Arial Narrow, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 900
    lineHeight: 0.95
    fontFeature: "\"tnum\""
  numeral-row:
    fontFamily: "Big Shoulders Display, Arial Narrow, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "\"tnum\""
  row-title:
    fontFamily: "Geist Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Geist Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Geist Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
  label:
    fontFamily: "Geist Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.06em"
  mono:
    fontFamily: "Geist Mono Variable, ui-monospace, SFMono-Regular, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  bar: "3px"
  thumb: "6px"
  cover: "8px"
  control: "10px"
  notice: "12px"
  panel: "14px"
  pill: "999px"
spacing:
  gutter: "16px"
  track-y: "12px"
  row-y: "18px"
  panel: "22px"
  row-gap: "24px"
  column-gap: "32px"
  page-top: "36px"
  page-bottom: "72px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-confirm:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.control}"
    height: "52px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
  button-ink:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.bg}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "52px"
  button-sm:
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  button-disabled:
    backgroundColor: "{colors.line}"
    textColor: "{colors.muted}"
  nav-link:
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "44px"
  nav-link-active:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
  input-confirm:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    typography: "{typography.numeral-row}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "52px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  pill-ok:
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  pill-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  pill-live:
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  pill-error:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  notice-warn:
    backgroundColor: "{colors.warn-soft}"
    rounded: "{rounded.notice}"
    padding: "14px 16px"
  notice-error:
    backgroundColor: "{colors.danger-soft}"
    rounded: "{rounded.notice}"
    padding: "14px 16px"
---

# Design System: youtoba

## Overview

**Creative North Star: "A Peça e o Buff"**

O youtoba é uma ferramenta de faxina que fala a língua da rua sem virar fantasia. Uma peça de grafite assina o app (o logo) e cada vídeo que saiu leva uma demão de tinta cinza por cima, como o buff que apaga pichação no muro. Todo o resto é operacional e contido: listas em fio de 1 px, números grandes em caixa-alta condensada, um painel lateral de ação e texto de interface em Geist. A rua aparece em três lugares e só neles: o logo, a névoa de spray da tela de entrada e o buff sobre o que foi apagado.

O mundo tem dois turnos. De noite é asfalto (fundo quase preto com ruído leve); de dia é concreto (cinza-quente claro com o mesmo ruído, mais fraco). O tema segue `prefers-color-scheme`; não há alternador. Os dois turnos têm os mesmos papéis de cor, só mudam os valores.

A densidade é de ferramenta de trabalho: a pessoa precisa ler quantos vídeos saem, quantos ficam, quanto custa na cota e se cabe hoje. Os números carregam a hierarquia; o rosa aparece só no que sai e na ação principal. O direction contract recusa o painel SaaS de cards com capa e botão roxo, e o build segue isso: as playlists e os vídeos são linhas, não cards.

**Key Characteristics:**
- Asfalto à noite e concreto de dia, com textura de ruído vetorial bem leve por cima de tudo.
- Rosa de spray só no que vai sair (repetidos, progresso da remoção) e na ação principal; o que já saiu fica sob o buff cinza.
- Títulos e números em Big Shoulders Display caixa-alta; interface em Geist.
- Listas em fio de 1 px, sem card por item.
- Um único gesto de assinatura: o buff, a demão de tinta cinza passada uma vez por vídeo apagado.
- Movimento curto (150 a 550 ms), ease-out, só sem `prefers-reduced-motion`.

## Colors

Neutros quentes de asfalto e concreto, um rosa de spray como única cor de ação, e verde, âmbar e vermelho guardados para estado. Valores sem sufixo são o turno claro (o `:root` padrão em `web/src/styles/tokens.css`); o sufixo `-dark` é o turno escuro, aplicado por `prefers-color-scheme: dark`.

### Primary
- **Rosa de Spray** (`accent` / `accent-dark`): o botão principal (Revisar, Remover, confirmar), a contagem de repetidos, o número "saem" do trio da Revisão, o estado "apagado", a pílula de remoção em andamento, o anel de foco e a seleção de texto. No claro é mais fundo para dar AA com texto branco; no escuro acende.
- **Rosa de Spray Fundo** (`accent-hover` / `accent-hover-dark`): só o hover do botão principal.
- **Tinta sobre Rosa** (`accent-fg` / `accent-fg-dark`): texto em cima do rosa. Branco no claro, quase preto no escuro.
- **Jato** (`spray` / `spray-dark`): o pigmento do gesto, não de controle. Pinta a parte "sai" da barra antes/depois, a barra de progresso da remoção, o pulso do item em andamento, o traço do número "antes" e a névoa da tela Entrar.

### Neutral
- **Concreto / Asfalto** (`bg` / `bg-dark`): o chão da página, por baixo da textura de ruído.
- **Superfície** (`surface` / `surface-dark`): o painel lateral de ação e o campo de busca.
- **Superfície Rebaixada** (`surface-2` / `surface-2-dark`): fundo de capa sem imagem, item ativo da navegação, hover do botão fantasma, campo de confirmação e bloco de comando.
- **Fio** (`line` / `line-dark`): os fios de 1 px entre linhas, bordas de controles, trilho das barras e botão desabilitado.
- **Tinta** (`fg` / `fg-dark`): texto principal, preenchimento do medidor de cota e da parte "fica" da barra, fundo do botão de tinta (Entrar com o Google).
- **Tinta Apagada** (`muted` / `muted-dark`): metadados, rótulos sob números, posição do vídeo, o número "antes".

### Estado
- **Verde Cabe** (`ok` / `ok-dark`): "cabe hoje", o ponto de "Conectado", o "sim" do painel.
- **Âmbar Cota** (`warn` / `warn-dark`, com `warn-soft`): cota curta, "N dias de cota", medidor abaixo de 10%, aviso de pausa.
- **Vermelho Erro** (`danger` / `danger-dark`, com `danger-soft`): só erro e item que falhou. Não é cor de marca.

### Cores do logo
"Chiclete e grafite", escolhido pelo dono em 20/11/2026 depois de testar três paletas num protótipo do app. O rosa chiclete manda (face em degradê `#FFA6D2` → `#FF4FA3`, chanfro de luz `#FFE0EF`), o grafite sustenta (bloco sombreado de `#5C5C6B` perto da face a `#1F1F27` no fundo) e o creme de adesivo `#F5EFE3` separa a peça de qualquer fundo; o contorno é `#0B0B12`. O rosa do logo é da mesma família do Jato e do Rosa de Spray, então o logo e a ação principal falam a mesma cor sem precisar de uma segunda. A fonte de verdade é `COLORS` em `web/scripts/build-logo.cjs`. A névoa da tela Entrar usa o rosa e o grafite do logo (tokens `--logo-face`, `#ff6fb8`, e `--logo-block`, `#5c5c6b`), e é o único lugar da interface onde esses tokens aparecem.

Contraste medido: face contra o contorno 6,4:1; face contra o bloco 2,2:1 (a separação vem do contorno, não da cor); bloco contra o asfalto 2,9:1, abaixo de 3, e por isso a borda de adesivo (16,7:1 contra o asfalto) garante a silhueta no escuro.

### Named Rules
**The Spray Marca o Que Sai Rule.** O rosa só aparece no que vai sair ou saiu e na ação que faz isso acontecer (mais o anel de foco). Um número rosa numa tela significa "isto vai ser apagado"; não use rosa para decorar, destacar seção ou enfeitar vazio.

**The Não É o YouTube Rule.** O vermelho, o logo e a marca do YouTube nunca são identidade. O vermelho do sistema (`danger`) é só erro.

**The Grafite Mora no Logo Rule.** O grafite do bloco e o creme do adesivo pertencem ao logo (e à névoa da entrada). A interface fica em neutros, rosa e as três cores de estado.

## Typography

**Display Font:** Big Shoulders Display 800 e 900 (com Arial Narrow, system-ui)
**Body Font:** Geist Variable (com system-ui, -apple-system, Segoe UI)
**Label/Mono Font:** Geist Mono Variable (com ui-monospace, SFMono-Regular), só para comandos

**Character:** Uma condensada de cartaz, sempre em caixa-alta, grita os números e os títulos; uma sans neutra e precisa faz todo o trabalho de interface. As duas não se misturam dentro de um mesmo elemento: o número é display, o rótulo embaixo é Geist.

As fontes vêm do `@fontsource` (importadas em `web/src/app/main.tsx`), sem CDN.

### Hierarchy
- **Display** (900, `--type-counter-min` a `--type-counter-max`, 0.82): o contador "ainda faltam" da tela de Remoção. Um por tela, no máximo.
- **Headline** (800, `--type-title-wide`, `--type-title-compact`; `--type-title` a `--type-hero-max` na tela Entrar): o `h1` de cada tela, caixa-alta, `text-wrap: balance`.
- **Title** (800, `--type-section`, 1): `h2` de painel e seção, caixa-alta. O `h2` do estado vazio sobe para `--type-title`.
- **Numeral** (900, `--type-display`, `--type-display-compact` no celular): o trio da Revisão. O resumo das Playlists e o "depois" da linha usam `--type-title`.
- **Numeral de linha** (800, `--type-section`): posição `#213` do vídeo, contagem de repetidos (`--type-emphasis`, 900), cota na barra de topo (`--type-stat`), contagem de job (`--type-subtitle`), o valor digitado na confirmação (`--type-emphasis`, `letter-spacing: 0.04em`).
- **Row title** (Geist 700, `--type-row-title`): título de playlist. Título de vídeo é Geist 600 no tamanho do corpo.
- **Body** (Geist 400, `--type-body`, 1.5): texto corrido; o `.lead` limita a 62ch e sobe para `--type-lead` na tela Entrar.
- **Caption** (Geist 500, `--type-label` a `--type-caption`, cor `muted`): rótulo sob número, metadado, custo, carimbo de hora.
- **Label** (Geist 700, `--type-label`, `0.06em`, caixa-alta): o estado do item na Remoção (apagado, agora, na fila, falhou). É um valor de estado dentro da linha, não um rótulo de seção.
- **Mono** (Geist Mono, `--type-label`): o comando de restauração copiável.

### Named Rules
**The Números Gritam Rule.** Toda quantidade que decide a ação (repetidos, saem, ficam, faltam, cota) é display com algarismos tabulares (`.num`), com um rótulo curto em Geist `muted` logo abaixo ou ao lado.

**The Duas Vozes Rule.** Big Shoulders só em títulos e números. Botões, navegação, rótulos e texto corrido são Geist.

## Layout

Coluna única centrada, `max-width: 1240px`, com calha lateral de 16 px que respeita `safe-area-inset`. A página abre com 36 px de respiro no topo e fecha com 72 px. A barra de topo é fixa (`sticky`), com 68 px de altura mínima: logo (50 px de altura; 32 px no celular), navegação Playlists/Remoções, cota do dia empurrada à direita e a conta.

- **Lista de playlists:** linhas em grade de cinco colunas (capa 128 px, título, antes→depois 210 px, repetidos 130 px, ação 230 px), 24 px entre colunas e 18 px de respiro vertical por linha. Até 1020 px vira uma grade de três áreas (capa, título em cima, números no meio, ação embaixo).
- **Revisão e Remoção:** conteúdo à esquerda e painel lateral de 360 px à direita, 32 px de vão. O painel é `sticky` a 92 px do topo. Até 1020 px tudo empilha e o painel deixa de ser fixo; um botão "Ir para confirmar" aparece no topo da lista.
- **Linha de vídeo:** posição 64 px, miniatura 96 px, texto, estado. No celular (até 720 px) a miniatura some e a posição cai para 48 px.
- **Entrar:** duas colunas (logo grande à esquerda, título e botão à direita) com três fatos numa faixa embaixo, separada por um fio. Até 900 px vira uma coluna; até 720 px os fatos empilham.
- **Pontos de quebra:** 1020 px (grades de linha e painel), 900 px (Entrar), 720 px (celular: topo quebra em duas linhas, a navegação ocupa a largura toda, rótulos da cota somem).

Não há escala de espaçamento formal; os tokens de `spacing` registram os valores que se repetem pelo uso.

### Named Rules
**The Fio de 1 px Rule.** Listas são linhas separadas por um fio `line` de 1 px, com fio também no topo da lista. Nada de card, fundo alternado ou sombra por item.

## Elevation & Depth

O sistema é chapado. A profundidade vem da textura e do contraste tonal, não de camadas. Uma camada de ruído vetorial (SVG `feTurbulence`, fixa, sem receber clique) cobre a página inteira com opacidade de 5% no concreto e 7% no asfalto. A barra de topo usa o fundo a 88% com `backdrop-filter: blur(10px)` para o conteúdo passar por baixo.

O único elemento que se descola é o painel lateral de ação. No claro ele leva uma sombra suave; no escuro a sombra some e entra um fio de 1 px (`--panel-border`), porque sombra não se lê sobre asfalto.

### Shadow Vocabulary
- **Painel** (`box-shadow: 0 12px 32px -18px rgb(0 0 0 / 0.35)`, só no claro): o painel lateral de ação.
- **Pulso** (`0 0 0 0` → `0 0 0 12px`, em `spray` a 60%): o ponto do item sendo apagado agora, animado.

### Named Rules
**The Asfalto É Chapado Rule.** No escuro não existe sombra. O que precisa se separar ganha um fio `line`.

**The Uma Camada Rule.** Só o painel lateral se eleva. Avisos, linhas, campos e botões ficam no chão.

## Shapes

Cantos levemente arredondados e consistentes, sem geometria inventada. Controles (botões, busca, confirmação) usam 10 px; avisos 12 px; o painel 14 px; capas 8 px; miniaturas e o anel de foco 6 px; barras 3 px (a de progresso da remoção, com 14 px de altura, usa 7 px). Pílulas e o item da navegação são cápsulas completas. Bordas são sempre de 1 px; o anel de foco é a única linha grossa (3 px em `accent`, 2 px de afastamento).

A forma orgânica fica com o buff: uma demão de rolo com bordas irregulares (recorte em polígono) e as listras verticais do rolo. É a única forma "pintada à mão" da interface.

## Components

### Buttons
Diretos e sólidos, nunca com ícone sozinho.
- **Shape:** cantos de 10 px, altura mínima de 44 px (36 px na variante pequena, 52 px na confirmação e no Entrar com o Google).
- **Primary:** fundo `accent`, texto `accent-fg`, Geist 600, 0 18px. Uma ação principal por região.
- **Hover / Focus:** o fundo desce para `accent-hover`; ao apertar desce 1 px (`translateY(1px)`). Transição de 150 ms ease-out em fundo e posição, só sem movimento reduzido. Foco é o anel global de 3 px em `accent`.
- **Ghost:** transparente com fio `line`, texto `fg`; hover em `surface-2`. Para ações secundárias (Analisar de novo, Sair, Tentar de novo, Copiar comando).
- **Ink:** fundo `fg`, texto `bg`; hover mistura 15% do fundo. Só no "Entrar com o Google", com o ícone do Google preenchido.
- **Disabled:** fundo `line`, texto `muted`, sem borda, cursor `not-allowed`.
- Um `<small>` dentro do botão carrega o custo (ex.: "~14 un.") a 75% de opacidade.

### Chips
- **Style:** pílula de 12 px, Geist 600, 3px 9px, fundo da própria cor a 14% (ou o `*-soft`).
- **State:** `ok` (cabe hoje), `warn` (N dias de cota), `live` em rosa (removendo), `error` (falhou). Informativas, nunca clicáveis.

### Cards / Containers
- **Painel lateral de ação:** fundo `surface`, cantos de 14 px, 22 px de recheio, sombra no claro e fio no escuro (ver Elevation). Dentro: uma lista de definições (custo, saldo, cabe hoje), fios `line` como separadores, nota de segurança com escudo e o formulário de confirmação. É o único contêiner elevado do sistema.
- **Avisos:** grade com título em negrito e texto de 14 px, cantos de 12 px, 14px 16px, fio de 1 px. `warn` em âmbar suave; `error` em vermelho suave com título em `danger` e `role="alert"`.
- **Bloco de comando:** Geist Mono 12 px sobre `surface-2`, fio `line`, cantos de 8 px, rola na horizontal.

### Inputs / Fields
- **Busca:** fio `line` sobre `surface`, cantos de 10 px, 44 px de altura, ícone de lupa `muted` à esquerda, cursor de texto em `accent`. Foco: anel de 3 px em `accent` no rótulo inteiro (`focus-within`).
- **Confirmação:** o campo onde se digita o número exato de repetidos. Big Shoulders 800 a 28 px, 52 px de altura, fundo `surface-2`, placeholder `muted` a 60%. Foco: anel de 3 px em `accent`. Logo abaixo, uma dica de 12 px e o botão principal de 52 px.

### Navigation
- **Barra de topo:** logo, dois links (Playlists, Remoções), cota e conta. Links em Geist 600, 44 px de altura, cápsula completa, texto `muted`; hover vai para `fg`; a página atual (`aria-current="page"`) ganha fundo `surface-2` e texto `fg`.
- **Cota do dia:** rótulo "Cota hoje", saldo em Big Shoulders 800 a 22 px, um medidor de 96 por 6 px (preenchimento `fg`, âmbar abaixo de 10%) e a hora em que zera. Um texto para leitor de tela completa o que o medidor mostra.
- **Celular (até 720 px):** a navegação desce para uma segunda linha de largura total; o medidor, os rótulos e o ponto de conexão somem e a cota vira "Cota 9.830".
- **Trilha:** "Remoções / PLrap" em 13 px `muted` acima do `h1` nas telas de detalhe.

### Linha antes → depois
O coração da lista de playlists. O número "antes" em Big Shoulders 800 a 24 px `muted`, cortado por uma linha de 2 px em `spray`; o "depois" a 40 px em `fg`; "vídeos" em Geist 12 px. Embaixo, uma barra de 6 px: a parte que fica em `fg` a 55%, a parte que sai em `spray`. Ao lado, os repetidos em rosa (28 px, 900) com a porcentagem em caption. O corte do "antes" é um `line-through` de CSS.

### Buff (assinatura)
O gesto do sistema, em `web/src/shared/ui/TrackRow.tsx` (`BuffMark`) e `.buff` em `web/src/styles/app.css`. Cada vídeo com estado "apagado" ganha, por cima da miniatura e do título, uma demão de tinta cinza-concreto (`buff` / `buff-dark`, 86% de opacidade), com as listras verticais do rolo (`buff-streak`) e bordas irregulares. O título fica fantasma por baixo, como pichação apagada no muro; a posição e o rótulo "apagado" (em rosa) continuam à vista, então o estado não depende só da cor. Escolhido pelo dono em 20/11/2026 no lugar do risco de spray rosa ("aquele risco neon não está legal"), num protótipo com quatro opções (https://claude.ai/artifact/TnKhNFhyYNfafKpuEkZCLu).
- **Movimento:** só a linha recém-apagada (`fresh`) recebe a demão, uma vez: o rolo empurra a tinta da esquerda para a direita em 620 ms (`translateX`, `cubic-bezier(0.25, 0.8, 0.25, 1)`). Com movimento reduzido a tinta aparece pronta.
- **Cor:** cinza neutro do próprio mundo (concreto), sem brilho; o rosa sai do que já foi apagado e fica no que é ação.
- **Ainda não feito:** a textura de asfalto e concreto e a névoa do spray são vetoriais (ruído SVG e desfoque); não há versão raster.

### Contador de remoção
O número de vídeos que ainda faltam, em Display, com "ainda faltam" e "7 de 75 apagados" ao lado. Embaixo, a barra de progresso de 14 px em `spray` (cresce por `transform: scaleX` em 400 ms, sem recalcular layout) e a linha "Apagando <título> (#posição)" com o ponto pulsante.

A lista ao vivo (`web/src/features/removal/LiveTracks.tsx`, com a Motion) mostra uma janela de 9 linhas em volta do item atual, e a janela anda a cada consulta. O apagado do topo sai subindo 14 px e esmaecendo (250 ms); as outras linhas sobem para o lugar dele por FLIP, só com transform (400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`); o próximo da fila entra por baixo. É continuidade, não um segundo efeito: o gesto da tela continua sendo o buff. Com movimento reduzido nada se desloca: quem entra aparece em fade e quem sai some na hora. A Motion só carrega quando a tela de Remoção abre (rota em `lazy` e recursos em `LazyMotion`).

### Logo
A peça "YOUTOBA" em caixa-alta: letras Anton (fonte OFL, em `web/scripts/fonts/`) convertidas em vetor, com contorno grosso, bloco 3D sombreado para baixo e à direita, chanfro de luz na borda de cima das letras e borda de adesivo creme em volta de tudo. O favicon é o "Y" no mesmo desenho, em Archivo Black (também OFL), porque a Anton fica fina demais em 16 px. `web/src/assets/logo.svg` e o favicon são gerados por `web/scripts/build-logo.cjs`. Para mudar o desenho, edite o script e rode `npm run build:logo`; nunca edite o SVG à mão. Na barra de topo o logo tem 50 px de altura (32 px no celular); na tela Entrar ocupa a coluna da esquerda, até 680 px, com a névoa de spray por trás.

## Do's and Don'ts

### Do:
- **Do** usar `accent` só no que sai e na ação que remove; o resto da tela fica em neutros.
- **Do** escrever toda quantidade decisiva em Big Shoulders com `.num` (algarismos tabulares) e um rótulo curto em Geist `muted`.
- **Do** separar itens de lista com um fio `line` de 1 px, com fio também no topo da lista.
- **Do** manter 44 px de alvo mínimo em todo controle e o anel de foco de 3 px em `accent` com 2 px de afastamento.
- **Do** pôr todo movimento dentro de `@media (prefers-reduced-motion: no-preference)` (na Motion, `MotionConfig reducedMotion="user"`), entre 150 e 550 ms, com ease-out ou `cubic-bezier(0.16, 1, 0.3, 1)`, e animar só `transform` e `opacity`.
- **Do** definir cada cor nova nos dois turnos em `tokens.css`, com o fio no lugar da sombra no escuro.
- **Do** regenerar o logo com `npm run build:logo` depois de mudar `web/scripts/build-logo.cjs`.

### Don't:
- **Don't** usar o vermelho, o logo ou a marca do YouTube como identidade.
- **Don't** transformar linhas de playlist ou de vídeo em cards com capa, sombra e botão.
- **Don't** passar o buff em algo que não foi apagado de fato, nem animá-lo mais de uma vez por item.
- **Don't** levar o grafite ou o creme do logo para controles, textos ou fundos da interface.
- **Don't** usar Big Shoulders em botões, navegação, rótulos ou texto corrido.
- **Don't** pôr sombra em nada além do painel lateral, e nunca no turno escuro.
- **Don't** editar `web/src/assets/logo.svg` à mão.
