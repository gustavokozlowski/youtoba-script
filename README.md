# 🎬 YouTube Playlist Manager

API para gerenciamento de playlists do YouTube, permitindo autenticação OAuth2, listagem de playlists, remoção de vídeos duplicados e muito mais.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Endpoints da API](#endpoints-da-api)
- [Autor](#autor)

## 📖 Sobre o Projeto

Este projeto é uma API REST desenvolvida em Node.js com TypeScript que permite:

- ✅ Autenticação via OAuth2 com Google/YouTube
- ✅ Listagem de playlists do usuário
- ✅ Visualização de detalhes de playlists
- ✅ Identificação de vídeos duplicados
- ✅ Remoção automática de duplicatas

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **TypeScript** - Superset JavaScript com tipagem
- **Express** - Framework web
- **@googleapis/youtube** - SDK oficial da YouTube Data API v3
- **google-auth-library** - Autenticação OAuth2 com o Google
- **Biome** - Linter e formatter
- **ts-node-dev** - Execução e hot-reload em desenvolvimento

## 📁 Estrutura do Projeto

A organização das pastas, os nomes dos arquivos e a direção das dependências estão em [`docs/adr/0001-arquitetura-pastas-e-nomes.md`](docs/adr/0001-arquitetura-pastas-e-nomes.md). Em resumo:

- `src/config/`: validação do `.env` no boot e leitura de cada variável (`setting('NOME')`).
- `src/server/`: o app Express, o tratador de erro e as proteções (só localhost, CSP, limite de login).
- `src/infra/`: cliente HTTP do YouTube, SQLite (token cifrado e cota) e criptografia.
- `src/shared/`: erros e logger, sem depender de nada do projeto.
- `web/`: a interface (React + Vite).

## 🔧 Instalação

1. **Clone o repositório**
   ```bash
   git clone git@github.com:gustavokozlowski/youtoba-script.git
   cd youtoba-script
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   ```

4. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Servidor
PORT=3000

# YouTube API
API_KEY=sua_api_key_aqui
CLIENT_ID=seu_client_id_aqui
CLIENT_SECRET_KEY=seu_client_secret_aqui
REDIRECT_URL=http://localhost:3000/auth

# Chave para cifrar o refresh token salvo em disco (32 bytes em base64)
# node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
TOKEN_ENCRYPTION_KEY=sua_chave_aqui
```

### Login persistente

Depois do primeiro login, o refresh token fica salvo **cifrado** (AES-256-GCM) em `data/youtoba.db`, e o access token é renovado automaticamente. Reiniciar o servidor não exige novo login. Com o app em modo *Testing* no Google Cloud, o Google invalida o refresh token após 7 dias; aí a API responde 401 e basta abrir `/auth/login` de novo.

### Obtendo credenciais do Google

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto
3. Ative a **YouTube Data API v3**
4. Crie credenciais OAuth 2.0
5. Adicione as URLs de redirecionamento autorizadas

## 📜 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o servidor em modo desenvolvimento |
| `npm run dev:all` | API e interface juntas, com recarga (abra `http://localhost:5173`) |
| `npm run build` | Compila o TypeScript para JavaScript |
| `npm start` | Inicia o servidor em produção |
| `npm test` | Roda os testes (Vitest) |
| `npm run biome:format` | Formata o código |
| `npm run biome:lint` | Executa o linter |
| `npm run biome:check` | Verifica formatação e lint |
| `npm run biome:fix` | Corrige problemas automaticamente |

## 🌐 Endpoints da API

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/auth/login` | Redireciona para o login do Google |
| `GET` | `/auth` | Callback do OAuth2: salva o login e volta para a interface (`WEB_URL`, padrão `/`) |
| `GET` | `/auth/status` | Diz se há uma conta conectada (`{ "connected": true }`) |
| `POST` | `/auth/logout` | Revoga o acesso no Google e apaga o login salvo |

### Playlists

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/playlist/get-all` | Lista as playlists do usuário |
| `GET` | `/playlist/with-duplicates` | Analisa todas as suas playlists e lista as que têm duplicados, da mais suja para a mais limpa: id, título, capa, link, privacidade, total de vídeos, quantos ficam, duplicados, % duplicado, itens indisponíveis, vídeos mais repetidos, custo de quota para limpar e os comandos de dry-run e remoção. Com `?todas=true`, inclui as playlists sem duplicados. Estima o custo antes e recusa se não couber na quota do dia. |
| `GET` | `/playlist/:playlistId` | Total de itens da playlist (1 chamada) |
| `GET` | `/playlist/:playlistId/items` | Todos os itens, com posição, título e `videoId` |
| `GET` | `/playlist/:playlistId/duplicates` | **Dry-run**: o que seria removido e quanto de quota custaria. Não apaga nada. |
| `DELETE` | `/playlist/:playlistId/remove-duplicates?confirm=N` | Inicia a remoção em segundo plano e responde na hora (`202`) com um `jobId`. Exige `confirm` igual ao número de duplicados encontrados; grava um backup antes. |
| `GET` | `/playlist/:destino/mix?origem=<id>` | **Dry-run do Mix**: o que entraria no fim do destino vindo da origem e o que seria pulado (já no destino, repetido na origem, apagado ou privado), com o custo. Não escreve nada. |
| `POST` | `/playlist/:destino/mix?origem=<id>&confirm=N` | Inicia o Mix em segundo plano (`202` com `jobId`). A origem nunca muda; o destino só ganha itens, no fim. Exige `confirm` igual ao número que entra; grava um registro do que entrou (`backups/mix-*.json`) antes do primeiro insert. Detalhes em `docs/specs/mix-api.md`. |
| `POST` | `/mixes/:registro/undo?confirm=N` | **Desfaz um Mix**: tira do destino só os itens que aquele Mix adicionou e que ainda estão lá (por `playlistItemId`; uma cópia do mesmo vídeo posta por fora fica). Grava o backup do destino antes. O link vem no campo `desfazer` do job do Mix. |

### Acompanhamento e quota

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/jobs` | Remoções (`remocoes`) e Mixes (`mixes`) desde que o servidor subiu, o mais recente primeiro (resumo) |
| `GET` | `/jobs/:jobId` | Progresso da remoção ou do Mix (`tipo: "mix"`, `"3 de 40 vídeos adicionados"`) (inclui `itens`, cada um com seu `estado`: `apagado`, `falhou` ou `pendente`): `"12 de 75 itens apagados"`, percentual, último item, falhas e, se parou, o motivo e quando tentar de novo |
| `GET` | `/quota` | Quota do dia: usado, limite, restante, quantas remoções ainda cabem e quando zera |

**Duplicado** é o mesmo vídeo (`videoId`) aparecendo mais de uma vez. Fica sempre a primeira ocorrência pela posição na playlist. Vídeos diferentes com o mesmo título não são tocados.

### Desenvolvimento (desligado por padrão)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/dev/seed-test-playlist` | Cria a playlist privada `youtoba-teste` com 7 itens (3 duplicados) para validação manual. Só existe com `ENABLE_DEV_ROUTES=true`. |

## 🖥️ Interface

```bash
npm run build:web   # uma vez (e depois de atualizar o código)
npm run dev
```

Abra `http://localhost:3000`, entre com o Google e o youtoba mostra suas playlists com vídeos repetidos.

Para mexer na interface com recarga automática, um comando sobe as duas partes:

```bash
npm run dev:all   # API na 3000 + interface no Vite na 5173; Ctrl+C para as duas
```

Abra `http://localhost:5173`. O login já volta para lá, sem mudar o `.env`.

## 📝 Exemplo de Uso

### 1. Conectar a conta do YouTube

Com o servidor rodando, abra no navegador:

```
http://localhost:3000/auth/login
```

Você é levado ao login do Google e, depois de autorizar, volta para uma página de confirmação.

### 2. Listar playlists

```bash
curl http://localhost:3000/playlist/get-all
```

### 3. Remover duplicados com segurança

```bash
# 1. Veja o que seria removido (não apaga nada)
curl http://localhost:3000/playlist/PLxxxxxx/duplicates

# 2. Confirme com o número de duplicados mostrado no passo 1 (responde na hora com o jobId)
curl -X DELETE "http://localhost:3000/playlist/PLxxxxxx/remove-duplicates?confirm=3"

# 3. Acompanhe o progresso
curl http://localhost:3000/jobs/<jobId>
```

O terminal do servidor também mostra uma linha por item: `[remoção 1a2b3c4d] 12 de 75 itens apagados · <título>`.

Antes de apagar, a playlist inteira é salva em `backups/<playlistId>-<data>.json`. O YouTube não tem lixeira; para desfazer uma remoção:

```bash
npm run restore:playlist -- backups/PLxxxxxx-2026-11-19T10-00-00-000Z.json
```

A restauração devolve os itens removidos às posições originais e pode ser rodada mais de uma vez sem duplicar nada.

### Só local

O servidor só atende `localhost`/`127.0.0.1` e recusa pedidos disparados por outros sites abertos no navegador (sem CORS, `Origin` conferido nas escritas, `Sec-Fetch-Site` conferido nas leituras). `curl` e scripts locais funcionam normalmente.

### Quota da API

Cada projeto do Google Cloud tem 10.000 unidades por dia, que zeram à meia-noite no horário do Pacífico (5h em Brasília no inverno do hemisfério norte). Ler a playlist custa 1 unidade a cada 50 itens; cada remoção custa 50.

O servidor **conta o gasto de cada chamada** (no SQLite local) e, antes de cada remoção, confere o saldo do dia: apaga só o que cabe e para antes de o Google recusar. O dry-run e o `GET /quota` mostram quanto resta e quantas remoções ainda cabem hoje. Quando a remoção para por quota, o `GET /jobs/:jobId` diz a partir de quando dá para continuar — basta rodar o dry-run e a remoção de novo.

A conta é local: gastos do mesmo projeto do Google Cloud feitos por outros programas não aparecem. Se o Google responder `quotaExceeded` mesmo assim, o saldo do dia é zerado na hora. Para um limite diferente, use `YOUTUBE_DAILY_QUOTA` no `.env`.

## 📌 Pendências

O que ainda falta fazer está em [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md).

## 👨‍💻 Autor

**Gustavo Kozlowski**
