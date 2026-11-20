# youtoba-script

API local (Express + TypeScript) que conecta na conta do YouTube do usuário e remove vídeos duplicados de playlists com segurança. Roda só na máquina do usuário; não há deploy.

O que falta fazer está em @docs/PENDENCIAS.md. Leia antes de propor trabalho novo e atualize no mesmo PR que resolver um item.

## Comandos

- `npm run dev`: servidor em `localhost:3000` com recarga automática. Para as rotas de playlist de teste: `ENABLE_DEV_ROUTES=true npm run dev`.
- `npm run build:web` e depois `npm run dev`: a interface abre em `localhost:3000`.
- `npm run dev:web`: interface no Vite (`localhost:5173`) com recarga, repassando a API para a 3000. Para o login voltar para lá, use `WEB_URL=http://localhost:5173/` no `.env`.
- `npm test`: Vitest em dois projetos: `api` (unitários + integração com Supertest e nock) e `web` (componentes com Testing Library, jsdom).
- `npm run typecheck` (API e `web/`) e `npx @biomejs/biome check`: rode os dois, mais os testes e o `npm run build:web`, antes de dizer que terminou.
- `npm run restore:playlist -- backups/<arquivo>.json`: desfaz uma remoção a partir do backup.

## Convenções

- **Duplicado = o mesmo `videoId`.** Fica a primeira ocorrência pela posição. Vídeos diferentes com o mesmo título não são duplicados.
- **Tipos em arquivos próprios:** todo `type`/`interface` exportado vai num `*.types.ts` ao lado do módulo (ex.: `youtube.types.ts`, `client/client.types.ts`).
- **Chamadas ao YouTube só pelo `createTrackedClient`**, nunca `new YoutubeClient` direto: é ele que soma o custo na quota do dia.
- **Interface em `web/`** (React + Vite, mesmo `package.json`): rotas por hash (`#/playlists`, `#/p/:id`, `#/remocao/:jobId`), cores e fontes só pelos tokens de `web/src/styles/tokens.css`, tipos das respostas em `web/src/api/api.types.ts`. Dados do servidor só pelos hooks de `web/src/api/queries.ts` (TanStack Query, uma chave por dado); nada de `useEffect` + `fetch` nas telas. Leitura que gasta cota não relê sozinha (sem refetch ao focar a janela, retry só em erro de rede), e a resposta que traz `quotaHoje` atualiza a barra de cota direto. Animação de lista usa a Motion (`motion/react`, com `LazyMotion` e `MotionConfig reducedMotion="user"`), só em tela carregada com `lazy`; o resto é CSS. O logo é gerado por `npm run build:logo` (não edite o SVG à mão). Produto e público em `PRODUCT.md`.
- **Respostas da API em português** (`mensagem`, `erro`, `totalItens`...); código e nomes internos em inglês.
- **Logs sem token e sem o objeto de erro do axios** (ele carrega o header `Authorization`): use `apiFailure(error)`.
- Commits e PRs pequenos, um assunto por PR, merge com squash. O dono autorizou o Claude a mergear quando testes, `tsc` e Biome passam.

## Regras de segurança ao operar

- **Nunca apagar itens de uma playlist real sem confirmação explícita do usuário na conversa.** Sempre rode o dry-run (`GET /playlist/:id/duplicates`) e mostre o resultado antes.
- **Confira a quota antes** (`GET /quota`). Ela zera à meia-noite no horário do Pacífico (5h em Brasília no inverno do hemisfério norte). A cota padrão é 10.000 unidades/dia; cada remoção custa 50.
- Os dados locais ficam em `data/youtoba.db` (refresh token cifrado + consumo de quota) e `backups/`. Os dois estão no `.gitignore`; nunca faça commit deles nem do `.env`.

## Armadilhas conhecidas

- O `ts-node-dev` às vezes para de notar mudanças em arquivos depois de um `git checkout`. Se o servidor responder com código antigo, reinicie o `npm run dev` (o login continua salvo).
- Em modo *Testing* no Google Cloud, o refresh token expira em 7 dias: a API responde 401 e basta abrir `/auth/login` de novo.
- Os jobs de remoção (`GET /jobs/:jobId`) ficam em memória e somem quando o servidor reinicia. O arquivo de backup continua registrando o que foi removido.
