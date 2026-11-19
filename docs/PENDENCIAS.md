# Pendências

O que falta para dar o projeto por encerrado, em ordem de prioridade. Atualize este arquivo no mesmo PR que resolver um item: risque o item e anote o número do PR.

Situação em 19/11/2026: a remoção de duplicados funciona e foi validada com playlists reais de teste (dry-run, confirmação, backup, restauração, quota contada e progresso). 113 testes passando (82 da API, 31 da interface).

## 1. Segurança (fazer primeiro)

- [x] ~~**Restringir o CORS e proteger as rotas que alteram dados.**~~ (#14) Sem `cors()`; o middleware `localOnly` aceita só Host local (barra DNS rebinding), exige `Origin` igual ao Host em POST/DELETE e recusa pedidos `Sec-Fetch-Site: cross-site` (exceto a volta do login e a página inicial). Escolhemos conferir o `Origin` em vez de um token: os navegadores sempre mandam esse header em escritas de outro site, e o curl continua funcionando sem passo extra.
- [ ] **Excluir o cliente OAuth antigo no Google Cloud** (ação manual do dono da conta). O `client_secret` dele está no histórico público do git (commit `2113866`). Já existe um cliente novo em uso.
- [ ] **`state` + PKCE no login** (`/auth/login` e callback), com `express-session`. Protege contra CSRF de login.
- [ ] **`helmet`, rate limit em `/auth` e limite de tamanho do body.**

## 2. Qualidade e manutenção

- [ ] **CI no GitHub Actions:** `biome ci`, `tsc --noEmit`, `vitest run` e `npm audit --audit-level=high` em todo PR. Depois, proteger a `main` exigindo o CI verde.
- [ ] **Validar o `.env` com `zod` no boot** (`src/config/env.ts`): o servidor não sobe se faltar `CLIENT_ID`, `CLIENT_SECRET_KEY`, `REDIRECT_URL`, `API_KEY` ou `TOKEN_ENCRYPTION_KEY`, e diz qual falta.
- [ ] **Middleware de erro único** no fim do `createApp()` e **logs estruturados** (`pino`), sem token nem dados pessoais.
- [ ] **`biome.json` → `biome.jsonc`** com o motivo escrito ao lado de cada regra desligada (hoje `noExplicitAny` está desligada sem explicação). Ligar `vcs.useIgnoreFile`.
- [ ] **Remover dependências sem uso:** `@googleapis/docs`, `body-parser`, `express-session` (se não entrar no item de `state`), `jsonwebtoken`, `nodemon`, `cookie-parser`. Alinhar `@types/express` (v5) com o `express` (v4).
- [ ] **Arquivar a branch `develop`**, que ficou para trás (as ideias úteis dela já estão na `main`).
- [ ] **Jobs de remoção ficam só em memória:** se o servidor reiniciar no meio, o progresso some (o backup continua certo). Avaliar guardar o job no SQLite.

## 3. Funcionalidades (opcionais)

- [x] ~~**Interface web**~~ (#16, #17): entrar, playlists com repetidos, revisão com confirmação pelo número exato, remoção ao vivo e lista de remoções. Trocamos o EJS do plano por React + Vite (decisão do dono, 19/11).
- [ ] **Escolher itens um a um na revisão** (adiado pelo dono): o backend passa a aceitar a lista de `playlistItemId` escolhidos (TDD), e a revisão ganha caixas de seleção.
- [ ] **Consolidar a escala de tipos da interface**: o `app.css` usa uns 15 tamanhos soltos (14, 16, 18, 20, 22, 24, 28, 30, 38, 40, 44 px...); juntar em poucos degraus, virar tokens e registrar no `DESIGN.md` (o detector do impeccable aponta cada um).
- [ ] **Restaurar pela interface**: hoje a tela de remoção mostra o comando `npm run restore:playlist`; um botão que chama a restauração pelo servidor evita o terminal.
- [ ] **Validação real pela interface** na playlist de teste, antes de usar a interface em playlist real. Em 19/11 a cota do dia já estava zerada; conferido só o estado "sem cota" com dados reais. Fazer depois das 05:00.
- [ ] **Release v1.0.0 (PR 5):** `GET /health`, `engines` (Node ≥ 22), workflow de release por tag com changelog. Sem deploy e sem Docker (o projeto roda só localmente).
- [ ] **Opção para limpar itens indisponíveis** ("Deleted video" / "Private video"), separada da remoção de duplicados.

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
