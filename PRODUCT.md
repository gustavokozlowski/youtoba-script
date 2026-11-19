# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript em `web/`, no mesmo repositório da API. O Express serve o build em `localhost:3000`; no desenvolvimento, o Vite faz proxy para a API. Escolhido pelo dono em 19/11/2026 no lugar do EJS do plano original, pelo progresso ao vivo da remoção e pelas microinterações.

## Users

O dono da conta do YouTube, sozinho na própria máquina. Tem playlists grandes (centenas de vídeos) que acumularam cópias do mesmo vídeo, por exemplo quando metade de uma playlist foi colada de novo no fim dela. Quer limpar sem medo de perder nada e sem montar `curl` na mão.

## Product Purpose

Conectar a conta do YouTube, achar as playlists com vídeos repetidos e remover as cópias com segurança: ver antes o que sai, confirmar, acompanhar o progresso e poder desfazer. Sucesso é a playlist com cada vídeo uma vez só, na ordem original, sem nenhum vídeo perdido.

## Positioning

Roda só no computador do usuário, com o login dele. Nada sai da máquina além das chamadas ao próprio YouTube. A regra é estrita e previsível: duplicado é o mesmo `videoId`; fica a primeira ocorrência pela posição; vídeos diferentes com o mesmo título não são tocados.

## Operating Context

- O servidor sobe com `npm run dev` e a interface abre em `localhost:3000`.
- Login pelo Google (OAuth). Em modo *Testing* o login expira em 7 dias e precisa ser refeito.
- A API do YouTube tem cota diária de 10.000 unidades, que zera à meia-noite do Pacífico (5h em Brasília no inverno do hemisfério norte). Ler custa 1 unidade a cada 50 itens; cada remoção custa 50, então cabem cerca de 200 remoções por dia. Playlists grandes podem levar mais de um dia.
- A remoção roda em segundo plano, um item por vez, e para sozinha quando o saldo do dia acaba. O progresso fica em memória e some se o servidor reiniciar; o backup em disco continua certo.
- Antes de remover, a playlist inteira é salva em `backups/`. A restauração hoje é por linha de comando (`npm run restore:playlist`).

## Capabilities and Constraints

- Ler: status do login, cota do dia, playlists com duplicados (análise que gasta cota e é recusada se não couber), dry-run de uma playlist, progresso de uma remoção.
- Escrever: iniciar a remoção de todos os duplicados de uma playlist (exige o número exato de duplicados como confirmação), sair da conta.
- Ainda não existe: escolher itens individuais para remover (planejado), restaurar pela interface, limpar vídeos indisponíveis.
- Textos da interface em português do Brasil.
- O servidor só aceita pedidos da própria máquina e da própria origem.

## Brand Commitments

- Nome: **youtoba**.
- O logo tem pegada street (pedido do dono). Não usar a marca, o logo ou o vermelho do YouTube como identidade.

## Evidence on Hand

Dados reais vêm da conta do usuário em tempo de uso (títulos, capas, contagens). Não há depoimentos, métricas públicas ou outros usuários; nada disso deve ser inventado.

## Product Principles

1. Nada some sem o usuário ver antes: dry-run sempre antes da remoção, com o número exato.
2. Dizer a verdade sobre a cota: quanto custa, quanto cabe hoje, quando zera.
3. Mostrar o progresso de verdade enquanto apaga, item por item.
4. Sempre deixar claro como desfazer.

## Accessibility & Inclusion

WCAG 2.1 AA, alvos de pelo menos 44 px, foco visível, respeito a `prefers-reduced-motion` (pedido no `CLAUDE.md` global do dono).
