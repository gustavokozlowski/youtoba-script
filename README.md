# 🎬 YouTube Playlist Manager

API para gerenciamento de playlists do YouTube, permitindo autenticação OAuth2, listagem de playlists, remoção de vídeos duplicados e muito mais.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Endpoints da API](#endpoints-da-api)
- [Camada de Serviços](#camada-de-serviços)
- [Exemplos de Uso](#exemplos-de-uso)
- [Autor](#autor)

## 📖 Sobre o Projeto

Este projeto é uma API REST desenvolvida em Node.js com TypeScript que permite:

- ✅ Autenticação via OAuth2 com Google/YouTube
- ✅ Listagem de playlists do usuário
- ✅ Visualização de detalhes de playlists
- ✅ Paginação automática para playlists grandes
- ✅ Identificação de vídeos duplicados
- ✅ Remoção automática de duplicatas (individual ou em lote)

## 🚀 Tecnologias

| Tecnologia | Descrição |
|------------|-----------|
| **Node.js** | Runtime JavaScript |
| **TypeScript** | Superset JavaScript com tipagem estática |
| **Express** | Framework web minimalista |
| **Google APIs** | Integração com YouTube Data API v3 |
| **Axios** | Cliente HTTP |
| **Biome** | Linter e formatter moderno |
| **ts-node-dev** | Execução e hot-reload em desenvolvimento |

## 🏗️ Arquitetura

O projeto segue uma arquitetura em camadas:

```
┌─────────────────────────────────────────────────────────┐
│                      ROUTES                             │
│         (Define endpoints e associa controllers)        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    CONTROLLERS                          │
│    (Recebe requisições, valida e retorna respostas)     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      SERVICES                           │
│           (Lógica de negócio da aplicação)              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       CLIENT                            │
│        (Comunicação direta com APIs externas)           │
└─────────────────────────────────────────────────────────┘
```

## 📁 Estrutura do Projeto

```
script/
├── src/
│   ├── controllers/              # Controladores das rotas
│   │   ├── auth.controller.ts    # Autenticação OAuth2
│   │   └── playlist.controller.ts # Operações de playlist
│   │
│   ├── middlewares/              # Middlewares da aplicação
│   │   └── auth.middlewares.ts   # Validação de autenticação
│   │
│   ├── routes/                   # Definição das rotas
│   │   ├── auth.routes.ts        # Rotas de autenticação
│   │   ├── playlist.routes.ts    # Rotas de playlist
│   │   └── index.ts              # Agregador de rotas
│   │
│   ├── server/                   # Configuração do servidor
│   │   └── index.ts              # Entry point da aplicação
│   │
│   ├── services/                 # Lógica de negócio
│   │   └── youtube/
│   │       ├── client/
│   │       │   ├── youtube.client.ts   # Cliente HTTP YouTube
│   │       │   └── client.types.ts     # Tipagens do client
│   │       └── youtube-playlist.services.ts
│   │
│   └── utils/                    # Utilitários
│       └── repository/
│           └── user.repository.ts # Gerenciamento de tokens
│
├── .env                          # Variáveis de ambiente
├── .vscode/
│   └── launch.json               # Configuração de debug
├── biome.json                    # Configuração do Biome
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

Crie um arquivo `.env` na raiz do projeto:

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

### 🔑 Obtendo credenciais do Google

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto
3. Ative a **YouTube Data API v3**
4. Vá em **Credenciais** > **Criar credenciais** > **ID do cliente OAuth**
5. Configure a tela de consentimento OAuth
6. Adicione as URLs de redirecionamento autorizadas
7. Copie o `Client ID` e `Client Secret` para o `.env`

## 📜 Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| Desenvolvimento | `npm run dev` | Inicia com hot-reload |
| Build | `npm run build` | Compila TypeScript |
| Produção | `npm start` | Inicia servidor compilado |
| Formatar | `npm run biome:format` | Formata o código |
| Lint | `npm run biome:lint` | Executa o linter |
| Check | `npm run biome:check` | Verifica formatação e lint |
| Fix | `npm run biome:fix` | Corrige problemas automaticamente |

## 🌐 Endpoints da API

### 🔐 Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/get-url` | Obtém URL de autenticação OAuth2 |
| `GET` | `/auth/callback` | Callback do OAuth2 (recebe o token) |

### 📋 Playlists

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/playlists` | Lista todas as playlists do usuário |
| `GET` | `/playlist/:playlistId` | Obtém detalhes de uma playlist |
| `GET` | `/playlist/:playlistId/items` | Lista todos os itens de uma playlist |
| `DELETE` | `/playlist/:playlistId/remove-duplicates` | Remove vídeos duplicados |

## 🔧 Camada de Serviços

### YoutubeClient

Cliente HTTP para comunicação com a API do YouTube:

```typescript
// Métodos disponíveis
client.playlists()                          // Lista playlists
client.playlistDetails(playlistId)          // Detalhes da playlist
client.playlist(playlistId)                 // Itens da playlist
client.nextPlaylistPage(playlistId, token)  // Próxima página
client.deleteItemsById(items)               // Deleta itens (batch)
```

### YoutubeService

Camada de serviço com lógica de negócio:

```typescript
// Métodos disponíveis
service.getPlaylists()                      // Obtém playlists
service.getPlaylistDetailsById(playlistId)  // Detalhes da playlist
service.getPlaylistItems(playlistId)        // Itens com paginação
service.removeDuplicateVideos(playlistId)   // Remove duplicatas
```

## 📝 Exemplos de Uso

### 1. Obter URL de autenticação

```bash
curl -X POST http://localhost:3000/auth/get-url \
  -H "Content-Type: application/json" \
  -d '{
    "callbackUrl": "http://localhost:3000",
    "userid": "123"
  }'
```

**Resposta:**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 2. Listar playlists

```bash
curl -X GET http://localhost:3000/playlist
```

**Resposta:**
```json
{
  "mensagem": "DEU BOM CARAAALHO!",
  "resultado": {
    "items": [
      {
        "id": "PLxxxxxxxx",
        "contentDetails": {
          "itemCount": 150
        }
      }
    ]
  }
}
```

### 3. Obter detalhes de uma playlist

```bash
curl -X GET http://localhost:3000/playlist/PLxxxxxxxx
```

**Resposta:**
```json
{
  "mensagem": "OLHA SÓ OS DETALHES DA PLAYLIST AQUI!",
  "totalPages": 150
}
```

### 4. Remover vídeos duplicados

```bash
curl -X DELETE http://localhost:3000/playlist/PLxxxxxxxx/duplicates
```

**Resposta:**
```json
{
  "mensagem": "Duplicados removidos com sucesso!",
  "resultado": {
    "removidos": 15,
    "itensRestantes": 135
  }
}
```

## 🐛 Debug

O projeto está configurado para debug no VS Code. Pressione `F5` ou use o menu **Run and Debug** para iniciar.

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 👨‍💻 Autor

**Gustavo Kozlowski**

---