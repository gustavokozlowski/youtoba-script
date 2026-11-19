# Pendências

O que falta para dar o projeto por encerrado, em ordem de prioridade. Atualize este arquivo no mesmo PR que resolver um item: risque o item e anote o número do PR.

Situação em 19/11/2026: a remoção de duplicados funciona e foi validada com playlists reais de teste (dry-run, confirmação, backup, restauração, quota contada e progresso). 66 testes passando.

## 1. Segurança (fazer primeiro)

- [ ] **Restringir o CORS e proteger as rotas que alteram dados.** Hoje `cors()` aceita qualquer origem. Com o servidor rodando, uma página maliciosa aberta no navegador consegue chamar `localhost:3000`, ler os duplicados (inclusive o número que vai no `confirm`) e disparar `DELETE /playlist/:id/remove-duplicates`. Aceitar só a origem local e exigir um token (ou cookie de sessão + CSRF) nas rotas de escrita.
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

- [ ] **Interface com EJS (PR 4 do plano):** conectar, ver as playlists com duplicados, revisar o dry-run, marcar e remover, acompanhar o progresso. Formulários com CSRF, saída escapada, testes com Supertest. Seguir as skills de interface do `CLAUDE.md` global.
- [ ] **Validação real pela interface** na playlist de teste, antes de usar a interface em playlist real.
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
