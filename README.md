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
- **Google APIs** - Integração com YouTube Data API v3
- **Axios** - Cliente HTTP
- **Biome** - Linter e formatter
- **ts-node-dev** - Execução e hot-reload em desenvolvimento

## 📁 Estrutura do Projeto

```
script/
├── src/
│   ├── controllers/          # Controladores das rotas
│   │   ├── auth.controller.ts
│   │   └── playlist.controller.ts
│   ├── middlewares/          # Middlewares da aplicação
│   │   └── auth.middlewares.ts
│   ├── routes/               # Definição das rotas
│   │   ├── auth.routes.ts
│   │   ├── playlist.routes.ts
│   │   └── index.ts
│   ├── server/               # Configuração do servidor
│   │   └── index.ts
│   ├── services/             # Lógica de negócio
│   │   └── youtube/
│   │       ├── client/
│   │       │   └── youtube.client.ts
│   │       └── youtube-playlist.services.ts
│   └── utils/                # Utilitários
│       └── repository/
│           └── user.repository.ts
├── .env                      # Variáveis de ambiente
├── biome.json                # Configuração do Biome
├── package.json
├── tsconfig.json
└── README.md
```

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

# URLs
YOUTUBE_BASE_URL=https://youtube.googleapis.com/youtube/v3/

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
| `GET` | `/auth` | Callback do OAuth2 (salva o login e mostra a confirmação) |
| `GET` | `/auth/status` | Diz se há uma conta conectada (`{ "connected": true }`) |
| `POST` | `/auth/logout` | Revoga o acesso no Google e apaga o login salvo |

### Playlists

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/playlist/get-all` | Lista as playlists do usuário |
| `GET` | `/playlist/:playlistId` | Total de itens da playlist (1 chamada) |
| `GET` | `/playlist/:playlistId/items` | Todos os itens, com posição, título e `videoId` |
| `GET` | `/playlist/:playlistId/duplicates` | **Dry-run**: o que seria removido e quanto de quota custaria. Não apaga nada. |
| `DELETE` | `/playlist/:playlistId/remove-duplicates?confirm=N` | Inicia a remoção em segundo plano e responde na hora (`202`) com um `jobId`. Exige `confirm` igual ao número de duplicados encontrados; grava um backup antes. |

### Acompanhamento e quota

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/jobs/:jobId` | Progresso da remoção: `"12 de 75 itens apagados"`, percentual, último item, falhas e, se parou, o motivo e quando tentar de novo |
| `GET` | `/quota` | Quota do dia: usado, limite, restante, quantas remoções ainda cabem e quando zera |

**Duplicado** é o mesmo vídeo (`videoId`) aparecendo mais de uma vez. Fica sempre a primeira ocorrência pela posição na playlist. Vídeos diferentes com o mesmo título não são tocados.

### Desenvolvimento (desligado por padrão)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/dev/seed-test-playlist` | Cria a playlist privada `youtoba-teste` com 7 itens (3 duplicados) para validação manual. Só existe com `ENABLE_DEV_ROUTES=true`. |

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

### Quota da API

Cada projeto do Google Cloud tem 10.000 unidades por dia, que zeram à meia-noite no horário do Pacífico (5h em Brasília no inverno do hemisfério norte). Ler a playlist custa 1 unidade a cada 50 itens; cada remoção custa 50.

O servidor **conta o gasto de cada chamada** (no SQLite local) e, antes de cada remoção, confere o saldo do dia: apaga só o que cabe e para antes de o Google recusar. O dry-run e o `GET /quota` mostram quanto resta e quantas remoções ainda cabem hoje. Quando a remoção para por quota, o `GET /jobs/:jobId` diz a partir de quando dá para continuar — basta rodar o dry-run e a remoção de novo.

A conta é local: gastos do mesmo projeto do Google Cloud feitos por outros programas não aparecem. Se o Google responder `quotaExceeded` mesmo assim, o saldo do dia é zerado na hora. Para um limite diferente, use `YOUTUBE_DAILY_QUOTA` no `.env`.

## 👨‍💻 Autor

**Gustavo Kozlowski**
