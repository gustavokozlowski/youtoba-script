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
   git clone https://github.com/seu-usuario/script.git
   cd script
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
REDIRECT_URL=http://localhost:3000/auth/callback

# URLs
YOUTUBE_BASE_URL=https://youtube.googleapis.com/youtube/v3/

# JWT (opcional)
JWT_SECRET=seu_jwt_secret_aqui
```

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
| `npm run biome:format` | Formata o código |
| `npm run biome:lint` | Executa o linter |
| `npm run biome:check` | Verifica formatação e lint |
| `npm run biome:fix` | Corrige problemas automaticamente |

## 🌐 Endpoints da API

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/get-url` | Obtém URL de autenticação OAuth2 |
| `GET` | `/auth/callback` | Callback do OAuth2 (recebe o token) |

### Playlists

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/playlist` | Lista todas as playlists do usuário |
| `GET` | `/playlist/:id` | Obtém detalhes de uma playlist |
| `GET` | `/playlist/:id/items` | Lista itens de uma playlist |
| `DELETE` | `/playlist/:id/duplicates` | Remove vídeos duplicados |

## 📝 Exemplo de Uso

### 1. Obter URL de autenticação

```bash
curl -X POST http://localhost:3000/auth/get-url \
  -H "Content-Type: application/json" \
  -d '{"callbackUrl": "http://localhost:3000", "userid": "123"}'
```

### 2. Listar playlists

```bash
curl -X GET http://localhost:3000/playlist \
  -H "Authorization: Bearer seu_token_aqui"
```

### 3. Remover duplicatas

```bash
curl -X DELETE http://localhost:3000/playlist/PLxxxxxx/duplicates \
  -H "Authorization: Bearer seu_token_aqui"
```

## 👨‍💻 Autor

**Gustavo Kozlowski**
