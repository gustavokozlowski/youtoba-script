import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { routes } from '../routes';
import { localOnly } from './local-only';
import { loginRateLimit, securityHeaders } from './security';

// O build da interface (npm run build:web). Mesmo caminho a partir de src/server e de dist/server.
const WEB_DIST = path.resolve(__dirname, '../../web/dist');

export function createApp({ webDist = WEB_DIST } = {}) {
    const app = express();
    // Antes de tudo: nada de outro site ou de um Host externo chega às rotas.
    app.use(localOnly());
    app.use(securityHeaders());
    app.use(loginRateLimit());
    // Nenhuma rota lê formulário; JSON até 64 KB cobre uma lista de ids de vídeos.
    app.use(express.json({ limit: '64kb' }));
    app.use(cookieParser());
    // As rotas da interface são por hash (#/playlists), então basta servir os arquivos estáticos.
    if (fs.existsSync(webDist)) {
        app.use(express.static(webDist, { index: 'index.html' }));
    }
    app.use('/', routes);
    return app;
}
