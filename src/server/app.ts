import cookieParser from 'cookie-parser';
import express from 'express';
import { routes } from '../routes';
import { localOnly } from './local-only';

export function createApp() {
    const app = express();
    // Antes de tudo: nada de outro site ou de um Host externo chega às rotas.
    app.use(localOnly());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use('/', routes);
    return app;
}
