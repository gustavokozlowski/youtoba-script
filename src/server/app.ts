import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { routes } from '../routes';
import { localOnly } from './local-only';

// O build da interface (npm run build:web). Mesmo caminho a partir de src/server e de dist/server.
const WEB_DIST = path.resolve(__dirname, '../../web/dist');

export function createApp({ webDist = WEB_DIST } = {}) {
    const app = express();
    // Antes de tudo: nada de outro site ou de um Host externo chega às rotas.
    app.use(localOnly());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    // As rotas da interface são por hash (#/playlists), então basta servir os arquivos estáticos.
    if (fs.existsSync(webDist)) {
        app.use(express.static(webDist, { index: 'index.html' }));
    }
    app.use('/', routes);
    return app;
}
