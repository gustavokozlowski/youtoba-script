import { Router } from 'express';
import { authRouter } from '../routes/auth.routes';
import { devRouter } from '../routes/dev.routes';
import { playlistRouter } from '../routes/playlist.routes';

const routes = Router();

routes.use('/playlist', playlistRouter);
routes.use('/auth', authRouter);

// Rotas de apoio para validação manual. Desligadas por padrão.
if (process.env.ENABLE_DEV_ROUTES === 'true') {
    routes.use('/dev', devRouter);
}

export { routes };
