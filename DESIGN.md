---
name: youtoba
description: Faxina de playlists do YouTube; o spray marca o que sai.
colors: "bg #ecebe6 / bg-dark #0e0f13; surface #fff / surface-dark #16171d; fg #131318 / fg-dark #f2f0ea; muted #5c5d68 / muted-dark #a2a4b0; accent #c70f62 / accent-dark #ff3d93; spray #e4167a; ok #157a4c"
typography: "Big Shoulders Display para títulos/números; Geist Variable para UI/texto; Geist Mono para comandos; escala de 11 degraus em web/src/styles/tokens.css"
spacing: "gutter 16px; row 12px; panel 22px; gaps 24/32px; page 36px 72px"
radius: "bar 3px; thumb 6px; cover 8px; control 10px; notice 12px; panel 14px; pill 999px"
components: "botões 44px (small 36px); busca 44px; confirmação 52px; listas com fio 1px; só painel com sombra"
---

# Design System: youtoba

<!-- impeccable:design-map -->

**Modo:** Operate. **North star:** A Peça e o Risco.

- Asfalto/concreto; rosa apenas em itens removidos e ações destrutivas.
- Big Shoulders só em títulos/números; Geist em interface; Mono em comandos.
- Nunca usar vermelho, logo ou marca do YouTube como identidade.
- Sem cards para linhas, sem sombras fora do painel, sem risco em item não apagado.
- Foco visível, alvos de 44px, contraste WCAG AA e `prefers-reduced-motion`.
- Bootstrap em `web/src/app/main.tsx`; features em `web/src/features/`; compartilhados em `web/src/shared/`.
- Tokens em `web/src/styles/tokens.css`; aplicação em `web/src/styles/app.css`.
- Logo em `web/src/assets/logo.svg`, gerado por `web/scripts/build-logo.cjs`.
- Detalhes históricos: `.impeccable/design-full.md`.
