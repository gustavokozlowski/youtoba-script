import { Router } from 'express';
import { getQuota } from '../controllers/playlist.controller';
import { authRouter } from '../routes/auth.routes';
import { devRouter } from '../routes/dev.routes';
import { jobsRouter } from '../routes/jobs.routes';
import { playlistRouter } from '../routes/playlist.routes';

const routes = Router();

routes.use('/playlist', playlistRouter);
routes.use('/auth', authRouter);
routes.use('/jobs', jobsRouter);
routes.get('/quota', getQuota);

// Rotas de apoio para validação manual. Desligadas por padrão.
if (process.env.ENABLE_DEV_ROUTES === 'true') {
    routes.use('/dev', devRouter);
}

export { routes };
