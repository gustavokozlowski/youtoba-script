---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/app/App.tsx"
related_targets: ["web/src/features"]
---

Scope: o app web inteiro do youtoba (web/): Entrar, Playlists, Revisão, Remoção, Remoções. Modo Operate.
Público e tarefa: o dono da conta, sozinho no próprio computador, limpando vídeos repetidos de playlists grandes sem medo de perder nada.
Restrições: textos em pt-BR; WCAG AA, alvos de 44 px, foco visível, prefers-reduced-motion; não usar marca nem vermelho do YouTube; logo com pegada de grafite (pedido do dono).

## Direction contract
THESIS: uma ferramenta de faxina que fala a língua da rua sem virar fantasia: a peça de grafite assina o app e o spray marca o que saiu. Recusa o painel SaaS de cards com capa e botão roxo.
OWN-WORLD: asfalto à noite (#0E0F13, textura de ruído leve) e concreto de dia (#ECEBE6); rosa de spray (#FF3D93 / #C70F62) só no que sai e na ação principal; títulos e números em Big Shoulders Display caixa-alta; interface em Geist; listas em fio de 1px; logo "chiclete e grafite": YOUTOBA em Anton vetorizada, face rosa em degradê com chanfro de luz, bloco 3D grafite sombreado, contorno #0B0B12 e borda de adesivo creme.
STORY: a pessoa entende quantos vídeos saem e quantos ficam, confia porque vê a lista e o backup, confirma digitando o número exato e assiste cada cópia ser riscada.
FIRST VIEWPORT: Entrar: logo grande à esquerda com névoa de spray, título e botão "Entrar com o Google" à direita, três fatos embaixo. App: barra de topo com logo, Playlists/Remoções e a cota do dia; lista com antes→depois (riscado), repetidos em rosa, custo e "cabe hoje", botão Revisar.
FORM: lista operacional com painel lateral de ação; candidato 6 da lista (cartaz de oferta) virou ponto de partida e foi substituído por um mundo grafite fixado pelo dono ("logo street inspirada no grafitti, layouts lapidados com pegada urbana"). seed: none (pinned) "PRECISAMOS que a logo tenha uma pegada street inspirada no grafitti" / "refaça os layouts entregando algo mais lapidado com essa pegada urbana"; a primeira tela e as demais foram fixadas pela aprovação do protótipo (claude.ai/artifact/H9zq9GLGa4F5Sh9frUZFyH): "ta perfeito pode começar com força total".
Assinatura: o risco de spray (SVG com turbulência) desenhado por cima de cada vídeo apagado, uma vez, enquanto o contador grande desce. Movimento: 150-550 ms, ease-out, só sem reduced-motion.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
