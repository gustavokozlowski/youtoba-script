# ADR 0001: arquitetura de pastas, nomes e tipos

- **Data:** 20/11/2026
- **Status:** aceito
- **Pedido:** o dono quer nenhum code smell no projeto (seção 4 de `docs/PENDENCIAS.md`).

## Contexto

A API cresceu por camada técnica (`controllers/`, `services/`, `routes/`, `utils/`), e a interface por tipo de arquivo (`components/`, `screens/`, `lib/`). Os problemas que isso trouxe:

- **Arquivos que juntam assuntos:** `formatters.ts` (178 linhas) formata playlist, cota e remoção; `youtube-playlist.services.ts` (208) lê playlists, monta a análise e começa remoções; `queries.ts` (146) tem os dados de todas as telas.
- **Sufixos sem padrão:** `.services.ts` no plural, `-tracker.ts`, `.store.ts` dentro de `utils/repository/`, e um `index.ts` com lógica (`services/google/index.ts`).
- **Telas grandes demais e com nome em português**, contra a convenção do próprio projeto: `Revisao.tsx` (272), `Remocao.tsx` (214), `Playlists.tsx` (202), `Entrar.tsx`, `Remocoes.tsx`.
- **Tipos fora de `*.types.ts`** e lógica repetida entre telas (os itens estão listados em `docs/PENDENCIAS.md`).
- **Configuração lida espalhada:** `process.env.X ?? padrão` em 8 arquivos, com padrões repetidos em relação ao esquema `zod` de `src/config/env.ts`.

É um app pequeno, de uma pessoa, rodando na própria máquina. A estrutura tem que deixar óbvio onde cada coisa mora, sem cerimônia de arquitetura grande.

## Decisão

### API (`src/`): módulos por domínio, infraestrutura à parte

```
src/
  config/       env.ts (esquema e validação no boot), settings.ts (leitura de cada variável)
  server/       app.ts, index.ts, error-handler.ts, local-only.ts, security.ts
  modules/
    auth/       auth.routes, auth.controller, auth-pages, google-auth.service, pending-logins
    playlist/   playlist.routes, playlist.controller, playlist.service, playlist.formatter,
                duplicates, playlist-summary
    quota/      quota.routes, quota.controller, quota-tracker.service, quota-estimate,
                quota.formatter, tracked-client
    removal/    jobs.routes, removal.controller, removal-jobs.service, removal.formatter,
                backup, restore
    dev/        dev.routes, test-playlist.seed
  infra/
    youtube/    youtube.client, youtube-api.types, youtube.constants
    storage/    db-path, token.store, quota.store
    crypto.ts
  shared/       errors.ts, logger.ts
  scripts/      restore-playlist.ts (CLI)
```

- **Um módulo é um assunto do produto.** Ele reúne rotas, controller, serviço, formatador de resposta e regras puras desse assunto, cada um com seu `.types.ts`.
- **Direção das dependências:**
  - `server` → `modules` → `infra`/`shared`/`config`;
  - `infra` só conhece `shared` e `config`;
  - `shared` não conhece nada do projeto.
  - Um módulo pode usar outro (a remoção usa os duplicados de `playlist` e a cota de `quota`), mas a infraestrutura nunca usa um módulo.
- **`tracked-client` fica em `quota`, não em `infra`:** ele junta o login (`auth`) com a contagem de cota, e a regra "toda chamada ao YouTube soma na cota" é do domínio.
- **Configuração:** `src/config/settings.ts` expõe `setting('NOME')`, que lê `process.env` na hora e aplica o mesmo esquema `zod` do boot (os padrões existem num lugar só). Ler na hora, sem cache, deixa os testes trocarem variáveis entre um boot e outro.

### Interface (`web/src/`): features + shared

```
web/src/
  app/          main.tsx, App.tsx, TopBar.tsx, router.ts, query-client.ts
  features/
    auth/       SignInScreen.tsx, use-session-expiry.ts, auth.queries.ts
    playlists/  PlaylistsScreen.tsx + seções, playlists.queries.ts, overview-cache.ts
    review/     ReviewScreen.tsx + seções, review.queries.ts, use-review-confirmation.ts
    removal/    RemovalScreen.tsx, RemovalsScreen.tsx + seções, LiveTracks.tsx,
                removal.queries.ts, use-newly-removed.ts, motion-features.ts
  shared/
    api/        client.ts, api.types.ts, query-keys.ts, quota.queries.ts
    ui/         Icon, Notice, ApiErrorNotice, TrackRow
    lib/        format.ts (números, unidades, datas, hora da cota)
  styles/       tokens.css, app.css
  test/         setup.ts, render.tsx, fake-api.ts
```

- **Uma feature não importa o interior de outra.** O que duas features usam sobe para `shared/`. As chaves do cache (`query-keys.ts`) ficam em `shared/api`, porque a remoção invalida a análise das playlists.
- **Cada tela é um layout com seções nomeadas.** Dados e decisões ficam em hooks (`use-*.ts`) e funções puras testáveis. Limites: componente até ~120 linhas, função até ~30, JSX até 4 níveis.
- **Testes ao lado do que testam:** `ReviewScreen.test.tsx` junto da tela.
- O CSS continua em dois arquivos globais (`tokens.css` e `app.css`), com as classes já agrupadas por tela. Dividir por feature fica para quando ele atrapalhar, não agora: o build não ganha nada, e os tokens já são a fonte única de cor e fonte.

### Nomes e tipos (API e interface)

| O quê | Padrão | Exemplo |
|---|---|---|
| Pasta | kebab-case, em inglês | `modules/removal/`, `features/review/` |
| Arquivo de lógica | kebab-case + sufixo de papel | `playlist.controller.ts`, `quota-tracker.service.ts`, `token.store.ts`, `playlist.formatter.ts`, `auth.routes.ts`, `review.queries.ts` |
| Regra pura do domínio | kebab-case sem sufixo | `duplicates.ts`, `quota-estimate.ts` |
| Componente React | PascalCase, um por arquivo | `ReviewScreen.tsx`, `ApiErrorNotice.tsx` |
| Hook | `use-algo.ts` exportando `useAlgo` | `use-session-expiry.ts` |
| Tipos | `*.types.ts` ao lado do módulo, inclusive Props e tipos locais | `ReviewScreen.types.ts`, `playlist.types.ts` |
| Teste | mesmo nome + `.test.ts(x)` | `ReviewScreen.test.tsx` |

- **Sufixos de papel:** `.routes`, `.controller`, `.service` (orquestra com efeito colateral), `.store` (persistência), `.client` (HTTP externo), `.formatter` (forma da resposta), `.queries` (TanStack Query), `.types`, `.test`.
- **`index.ts` não é usado.** Cada import aponta para o arquivo de verdade, para a busca achar quem usa o quê.
- Código, nomes e tipos em inglês; textos para a pessoa e respostas da API em português (como já era).

### Guardas automáticas

- **Biome `noRestrictedImports`** em `overrides`:
  - `src/infra/**` e `src/shared/**` não importam `modules`;
  - `web/src/shared/**` não importa `features`;
  - cada feature não importa outra.
- **Checklist de code smells** no template de PR (`.github/pull_request_template.md`).

## Alternativas consideradas

- **Manter as camadas técnicas e só renomear arquivos:** resolve os nomes, mas mantém um assunto espalhado em 4 pastas, e os arquivos grandes continuam juntando assuntos.
- **Hexagonal completo (portas e adaptadores para tudo):** o projeto tem um só provedor (YouTube) e nenhum plano de trocar. Interfaces com uma implementação só seriam indireção sem retorno. A separação `modules`/`infra` já isola o que importa: a regra não importa o cliente HTTP do provedor nem SQLite.
- **Barrels (`index.ts`) por módulo:** escondem de onde vem cada coisa e criam ciclos de import fáceis de causar. Ficam de fora.

## Consequências

- Muitos arquivos mudam de lugar. Os PRs são feitos por camada e por lado (API, depois interface), e os testes de comportamento ficam verdes antes e depois de cada um. Nenhum PR muda o que o app faz.
- O histórico de cada arquivo continua acessível com `git log --follow`.
- Quem chega ao projeto acha um assunto inteiro numa pasta só, e o Biome barra o import que quebra a direção das dependências.

## Plano de PRs

1. Este ADR.
2. API: `config/settings.ts`, `shared/` e `infra/` (movimentos e nomes) + guarda do Biome para `infra` e `shared`.
3. API: `modules/` (auth, playlist, quota, removal, dev); `formatters.ts` e o serviço de playlist divididos por módulo.
4. Interface: `app/`, `features/`, `shared/`, nomes em inglês, tipos em `*.types.ts`, testes ao lado.
5. Interface: deduplicação (`ApiErrorNotice`, `usePlaylistTitle`, hora da cota e datas em `format.ts`).
6. Interface: telas divididas em seções e hooks, dentro dos limites.
7. Guardas do Biome para as features e template de PR com o checklist.
