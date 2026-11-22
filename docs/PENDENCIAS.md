# Pendências

O que falta para dar o projeto por encerrado, em ordem de prioridade. Atualize este arquivo no mesmo PR que resolver um item: risque o item e anote o número do PR.

Situação em 21/11/2026: a remoção de duplicados funciona e foi validada pela interface numa playlist real, e antes com playlists reais de teste (dry-run, confirmação, backup, restauração, quota contada e progresso). 250 testes passando (199 da API, 51 da interface).

## 1. Segurança (fazer primeiro)

- [x] ~~**Restringir o CORS e proteger as rotas que alteram dados.**~~ (#14) Sem `cors()`; o middleware `localOnly` aceita só Host local (barra DNS rebinding), exige `Origin` igual ao Host em POST/DELETE e recusa pedidos `Sec-Fetch-Site: cross-site` (exceto a volta do login e a página inicial). Escolhemos conferir o `Origin` em vez de um token: os navegadores sempre mandam esse header em escritas de outro site, e o curl continua funcionando sem passo extra.
- [ ] **Excluir o cliente OAuth antigo no Google Cloud** (ação manual do dono da conta). O `client_secret` dele está no histórico público do git (commit `2113866`). Já existe um cliente novo em uso.
- [x] ~~**`state` + PKCE no login**~~ (#24): `state` aleatório preso ao navegador por um cookie `HttpOnly; SameSite=Lax; Path=/auth` (10 min, uso único) e PKCE S256, com o `code_verifier` só no servidor. Barra CSRF de login (outro site abrindo `/auth?code=` do atacante) e código interceptado. Sem `express-session`: os logins pendentes ficam em memória (`pending-logins.ts`). Falta confirmar num login real que o Google aceita o PKCE neste cliente.
- [x] ~~**`helmet`, rate limit em `/auth` e limite de tamanho do body.**~~ (#26): CSP só com o próprio app e as miniaturas de `*.ytimg.com` (`frame-ancestors 'none'`, sem HSTS e sem `upgrade-insecure-requests` porque roda em http://localhost); 20 tentativas de login por 10 min em `/auth/login` e na volta do Google (o `/auth/status` fica de fora); JSON até 64 KB e sem parser de formulário. Em `src/server/security.ts`.

## 2. Qualidade e manutenção

- [x] ~~**CI no GitHub Actions**~~ (#22, #23): `biome ci`, typecheck da API e do `web/`, testes, build da interface e `npm audit --audit-level=high` em todo PR e na `main` (`.github/workflows/ci.yml`, actions pinadas por SHA, permissão só de leitura). O vitest subiu para a 4.1.12 para tirar 2 vulnerabilidades críticas. A `main` passa a exigir o check `checks` verde.
- [x] ~~**Validar o `.env` com `zod` no boot**~~ (#27): `src/config/env.ts` confere as obrigatórias (`API_KEY`, `CLIENT_ID`, `CLIENT_SECRET_KEY`, `REDIRECT_URL`, `TOKEN_ENCRYPTION_KEY`) e o formato das opcionais; o servidor sai com uma linha por variável, sem mostrar valores. Ler toda configuração por esse módulo entra na refatoração final.
- [x] ~~**Middleware de erro único** e **logs estruturados** (`pino`)~~ (#30): `errorHandler` no fim do `createApp()` (400/413 do corpo com mensagem; o resto vira 500 genérico com log só de método, caminho, status e mensagem). Os controllers repassam com `next`. Logger com `redact` de `authorization` e tokens, sem `pid`/`hostname`, legível no terminal e JSON fora dele; o log da remoção leva o id do item, não o título do vídeo. `LOG_LEVEL` no `.env`. O CLI de restauração continua com `console` (é a interface dele).
- [x] ~~**`biome.json` → `biome.jsonc`**~~ (#29): comentado, `vcs.useIgnoreFile` ligado e `noExplicitAny` de volta (os 18 `any` viraram `unknown` com `httpErrorLike`/`errorMessage` no código e fixtures tipadas nos testes). A pasta `test/` passou a ter typecheck (`tsconfig.test.json`), e `npm run check` roda tudo com um código de saída só.
- [x] ~~**Remover dependências sem uso**~~ (#28): saíram `googleapis` e `@googleapis/docs` (nenhum import; eram a origem de 3 das 5 vulnerabilidades moderadas), `body-parser`, `express-session`, `jsonwebtoken`, `nodemon` e os tipos de `express-session` e `jsonwebtoken`. `@types/express` 4.17.25, alinhado ao `express` 4.
- [x] ~~**`google-auth-library` 11.**~~ (#36): atualizado para 11.3.4, com `gaxios` 8 e sem vulnerabilidades no `npm audit --audit-level=high`; o fluxo OAuth/PKCE passou pelos 14 testes de auth. Falta apenas confirmar um login real no Google.
- [x] ~~**Arquivar a branch `develop`.**~~ (ação administrativa): a referência remota foi removida depois de confirmar que não havia PR aberta baseada nela e que suas ideias úteis já estavam na `main`.
- [x] ~~**Jobs de remoção ficam só em memória.**~~ (avaliação): persistir um snapshot no SQLite é útil para manter histórico e progresso, mas não é seguro retomar automaticamente uma remoção interrompida — o cliente OAuth, a quota e as exclusões já tentadas podem ter mudado. Fica decidido para uma futura implementação: persistir o snapshot, marcar jobs `running` como `interrupted` no boot e apontar para o backup, sem repetir exclusões.

## 3. Funcionalidades (opcionais)

- [x] ~~**Interface web**~~ (#16, #17): entrar, playlists com repetidos, revisão com confirmação pelo número exato, remoção ao vivo e lista de remoções. Trocamos o EJS do plano por React + Vite (decisão do dono, 19/11).
- [ ] **Mix: juntar uma playlist em outra** (pedido do dono em 22/11; plano aprovado: itens entram no fim do destino, com desfazer). Feito: #57 (loop item a item genérico e registro de jobs compartilhado entre tipos), #58 (regra pura `planMix`), #59 (API: dry-run, início, job, registro e `/jobs` para todos os tipos; spec em `docs/specs/mix-api.md`). #60 (desfazer: `POST /mixes/:registro/undo`). Falta: as telas. Copia os itens de uma playlist de origem para uma de destino sem criar repetidos: pula todo `videoId` que já está no destino e os repetidos da própria origem, mantendo a ordem da origem. Integridade: a origem nunca é alterada e o destino só ganha itens (nada é apagado nem reordenado). Mesmo pipeline das remoções: dry-run com o que entra e o que é pulado (já no destino, repetido na origem, apagado ou privado), confirmação pelo número exato, quota conferida antes (cada `playlistItems.insert` custa 50 unidades), job com progresso e um registro do que foi adicionado para desfazer. Rodar de novo é seguro: o que já entrou é pulado.
- [ ] **Mix com escolha um a um** (pedido do dono em 22/11): no dry-run do Mix, caixas de seleção para escolher quais itens da origem entram. A API aceita a lista de `playlistItemId` escolhidos e recusa id que não está na origem ou que já está no destino (TDD).
- [ ] **Escolher um a um os vídeos para excluir** (pedido do dono em 22/11; antes adiado): a revisão ganha caixas de seleção e o backend passa a aceitar a lista de `playlistItemId` escolhidos (TDD), recusando id que não pertence à playlist. Mesmo pipeline: backup antes, confirmação pelo número exato de escolhidos, quota e job.
- [x] ~~**Consolidar a escala de tipos da interface.**~~ (#39): `tokens.css` agora define 11 degraus tipográficos e aliases semânticos por papel; `app.css` não usa tamanhos literais e a escala foi registrada no `DESIGN.md`.
- [x] ~~**Restaurar pela interface.**~~ (#41): a tela de remoção agora chama a restauração pelo servidor; o comando de terminal continua disponível como alternativa.
- [x] ~~**Validação real pela interface**~~ (#55): em 21/11 o dono removeu 31 repetidos de uma playlist real (60 → 29 itens) pela interface, do começo ao fim: revisão, confirmação, backup gravado antes, progresso ao vivo ("12 de 31", "21 de 31"...) e "31 de 31 apagados, concluída" na tela e em `GET /jobs/:id`. O "80 de 0" relatado depois da #51 vinha de um servidor ainda com o código antigo (o `ts-node-dev` não recarrega depois de um `git checkout`).
- [x] ~~**Release v1.0.0.**~~ (#40): `GET /health`, `engines` (Node ≥ 22) e workflow de release por tag com changelog. Sem deploy e sem Docker (o projeto roda só localmente).
- [x] ~~**Opção para limpar itens indisponíveis**~~ (#48, #49), separada da remoção de duplicados. Decisão do dono (20/11): só "Deleted video" sai; "Private video" fica (pode voltar a ser público). API pronta (#48): `GET /playlist/:id/unavailable` (dry-run) e `DELETE /playlist/:id/remove-unavailable?confirm=N`, com o mesmo pipeline dos duplicados (confirmação exata, backup antes, quota, job com `tipo`). Conta como apagado só o item com título "Deleted video" **e** sem `videoPublishedAt`. A cópia de um apagado continua na lista de duplicados. Vídeo apagado não volta pela restauração. Interface (#49): revisão em `#/p/:id/apagados`, links "N apagados" na lista e na revisão de repetidos, e a análise geral passa a mostrar também as playlists que só têm vídeos apagados.

## 4. Refatoração final (antes da release v1.0.0)

Pedido do dono em 20/11/2026: nenhum code smell no projeto. Passar a code base inteira (API e `web/`) pelo composition pattern e pela deduplicação, com a arquitetura de pastas e os nomes padronizados. Fazer em PRs pequenos, um assunto por PR, com os testes de comportamento verdes antes e depois de cada passo (refatorar sem mudar o que a tela faz). Abrir com um ADR curto em `docs/adr/` que fixa a estrutura e os nomes.

- [x] ~~**ADR de arquitetura e nomes.**~~ (#31): `docs/adr/0001-arquitetura-pastas-e-nomes.md` fixa a estrutura, os nomes, a direção das dependências e o plano em 7 PRs. A proposta original era:
    - `web/src` por feature: `features/<feature>/{api,model,ui}` (auth, playlists, review, removal) + `shared/{api,ui,lib}`; uma feature não importa o interior de outra (regra `noRestrictedImports` no Biome).
    - API por módulo de domínio (`modules/{auth,playlist,quota,removal}`), cada um com rotas, controller, serviço e tipos; infraestrutura (cliente do YouTube, SQLite, cripto) em `infra/`.
    - Nomes: pastas e arquivos em kebab-case com sufixo de papel único (`.controller.ts`, `.service.ts`, `.store.ts`, `.routes.ts`, `.types.ts`, `.test.ts`); componentes React em PascalCase; hooks `use-*.ts` exportando `useAlgo`; tudo em inglês (hoje há `.services.ts` no plural, `index.ts` com lógica e telas em português: `Entrar`, `Revisao`, `Remocao`, `Remocoes`).
- [x] ~~**API em módulos de domínio.**~~ (#33): auth, playlist, quota, removal e dev ficaram em `src/modules/`; cada assunto separa rotas, controller, serviço, formatter e types; infraestrutura e regras compartilhadas ficaram em `src/infra/` e `src/shared/`.
- [x] ~~**Tipagens separadas do código.**~~ (#34): Props e tipos locais da interface foram movidos para arquivos `*.types.ts` ao lado dos módulos, incluindo app, features, shared UI e fixtures de teste.
- [x] ~~**Telas quebradas em seções e hooks.**~~ (#34): `PlaylistsScreen`, `ReviewScreen` e `RemovalScreen` agora orquestram seções menores; decisões e dados ficam em hooks como `useReviewScreen`, `useReviewConfirmation` e `useRemovalWindow`.
- [x] ~~**Deduplicação.**~~ (#35): reset da cota, títulos pelo cache, datas e avisos usam helpers/componentes compartilhados; `ApiErrorNotice` é renderizado diretamente pelas telas, sem wrappers de erro duplicados. A API já foi dividida por assunto em #33.
- [x] ~~**Testes ao lado do que testam.**~~ (#34): testes de playlists e revisão acompanham as telas; os testes do shell ficam em `app/App.test.tsx`.
- [x] ~~**Guardas automáticas para não voltar.**~~ (#34): Biome impede imports de `shared` para `app`/features e de features para outras features ou para `app`.

## Feito (referência)

| PR | O que entrou |
| --- | --- |
| #3 | Setup: import do axios, dependências, `.env.example`, README |
| #4 | Correção da leitura do `code` no callback do OAuth |
| #5 | Login com um clique, sem mostrar o token |
| #6 | Rota de desenvolvimento que cria playlists de teste |
| #7 | Remoção um item por vez, com nova tentativa; respostas e logs honestos |
| #8 | Refresh token cifrado em SQLite, renovação automática, logout |
| #9 | Dry-run, confirmação, backup, restauração, páginas de 50; tipos em `*.types.ts` |
| #10 | Quota diária contada; remoção em segundo plano com progresso |
| #11, #12 | `GET /playlist/with-duplicates` |
| #14 | Servidor só aceita pedidos da própria máquina e da própria interface (`localOnly`, sem CORS) |
| #15 | Base para a interface: itens com estado no job, `GET /jobs`, login volta para a interface |
| #16 | Interface web (React + Vite): logo, entrada e lista de playlists com repetidos |
| #17 | Interface: revisão do dry-run, remoção ao vivo com o risco de spray, lista de remoções |
| #18 | Logo novo "chiclete e grafite" (Anton, bloco 3D, adesivo), escolhido num protótipo do app |
| #19 | TanStack Query na interface: cache por chave, polling do job pelo `refetchInterval`, cota da barra vinda das próprias respostas, revisão não relê a playlist por 30 s |
| #20 | Remoção ao vivo com a Motion: a lista desliza quando a janela anda (FLIP, só transform), barra de progresso por `scaleX`, tela carregada sob demanda |
| #21 | Plano da refatoração final (seção 4) e convenções de tipos e nomes |
| #22 | vitest 4.1.12: tira 2 vulnerabilidades críticas do runner de testes |
| #23 | CI no GitHub Actions (Biome, tipos, testes, build, audit) |
| #24 | Login com `state` preso ao navegador e PKCE (S256) |
| #25 | Cookie do `state` lido pelo `cookie-parser` que o app já tinha |
| #26 | `helmet` com CSP, limite de tentativas de login e JSON até 64 KB |
| #27 | `.env` validado com `zod` no boot |
| #28 | Dependências sem uso removidas; `@types/express` alinhado |
| #29 | `biome.jsonc` comentado, `noExplicitAny` ligada, typecheck dos testes e `npm run check` |
| #30 | Tratador de erro único e logs `pino` sem token, sem dado pessoal |
| #31 | ADR 0001: arquitetura de pastas, nomes e tipos |
| #32 | Refatoração da API, parte 1: `config/settings.ts`, `shared/`, `infra/` e guardas de import no Biome |
| #33 | API em módulos de domínio (`src/modules/`) |
| #34 | Interface por features, tipos em `*.types.ts`, telas em seções e hooks, guardas de import |
| #35 | Deduplicação da interface (avisos de erro, datas, reset da cota) |
| #36 | `google-auth-library` 11 |
| #37, #38 | Branch `develop` arquivada; decisão sobre persistir os jobs de remoção |
| #39 | Escala tipográfica consolidada nos tokens |
| #40 | Release v1.0.0: `GET /health`, `engines`, workflow de release |
| #41 | Restaurar backup pela tela de remoção |
| #42, #43 | Entrada suave e interações/feedback mais macios na interface |
| #44 | Cliente do YouTube no SDK oficial |
| #46 | Estado "concluído" da remoção sem contadores negativos ou NaN |
| #47 | Análise geral lê duas playlists por vez, na mesma ordem, e para no lote seguinte se a quota acabar |
| #48 | API para remover vídeos apagados (dry-run e remoção com confirmação), pipeline de remoção único para os dois tipos, e duas remoções simultâneas na mesma playlist não começam dois jobs |
| #49 | Interface para remover vídeos apagados: revisão própria, painel de confirmação único para os dois tipos, aviso de que apagado não volta, e a análise geral conta os apagados |
| #50 | `npm run dev:all`: API e interface juntas com um comando; proxy do Vite passa `/backups` e `/health`; `LOG_FORMAT` opcional |
| #51 | Tela de remoção mostrava "80 de 0 apagados": `GET /jobs/:id` não trazia `total` (só a resposta 202 trazia) |
| #52 | Marca do vídeo removido: o risco neon rosa virou "buff", uma demão de tinta cinza-concreto (escolha do dono num protótipo com 4 opções) |
| #53 | `dev:all` no Windows derruba a árvore inteira (`taskkill /T`), não só o npm; Linux e macOS seguem com o grupo de processos |
| #54 | Registro da #53 nesta lista |
| #55 | Validação real pela interface concluída; causa do "80 de 0" relatado depois da #51 anotada |
| #56 | Backlog: Mix de playlists, Mix com escolha um a um e exclusão com escolha um a um |
| #57 | Mix, parte 1: loop item a item (`runOneByOne`) usado pela remoção e pelo novo `addVideosToPlaylist`; jobs num registro compartilhado (`JobStore`), para remoção e Mix na mesma playlist se bloquearem |
| #58 | Mix, parte 2: regra pura `planMix` (o que entra e o que é pulado: indisponível, já no destino, repetido na origem), com 14 testes escritos antes |
| #59 | Mix, parte 3a: `GET`/`POST /playlist/:destino/mix` (dry-run, confirmação exata, só insere no fim do destino, registro antes do 1º insert), job do Mix no mesmo `/jobs` (`{ remocoes, mixes }`), trava única por playlist entre remoção e Mix, runner compartilhado que não derruba o servidor se o registro falhar |
| #60 | Mix, parte 3b: desfazer (`POST /mixes/:registro/undo?confirm=N`) pelo pipeline da remoção: tira só os itens do registro que ainda estão no destino, com backup antes; validação de caminho do restore e do desfazer num helper só |
