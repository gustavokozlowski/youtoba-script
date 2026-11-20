import { Router } from 'express';
import { setting } from '../config/settings';
import { authRouter } from '../modules/auth/auth.routes';
import { devRouter } from '../modules/dev/dev.routes';
import { getQuota } from '../modules/playlist/playlist.controller';
import { playlistRouter } from '../modules/playlist/playlist.routes';
import { jobsRouter } from '../modules/removal/removal.routes';

const routes = Router();

routes.use('/playlist', playlistRouter);
routes.use('/auth', authRouter);
routes.use('/jobs', jobsRouter);
routes.get('/quota', getQuota);

// Rotas de apoio para validação manual. Desligadas por padrão.
if (setting('ENABLE_DEV_ROUTES')) {
    routes.use('/dev', devRouter);
}

export { routes };
