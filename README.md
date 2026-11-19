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
| `GET` | `/playlist/get-all` | Lista todas as playlists do usuário |
| `GET` | `/playlist/:playlistId` | Obtém detalhes de uma playlist |
| `DELETE` | `/playlist/:playlistId/remove-duplicates` | Remove vídeos duplicados |

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

### 3. Remover duplicatas

```bash
curl -X DELETE http://localhost:3000/playlist/PLxxxxxx/remove-duplicates
```

## 👨‍💻 Autor

**Gustavo Kozlowski**
