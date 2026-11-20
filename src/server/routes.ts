import { Router } from 'express';
import { setting } from '../config/settings';
import { authRouter } from '../modules/auth/auth.routes';
import { devRouter } from '../modules/dev/dev.routes';
import { playlistRouter } from '../modules/playlist/playlist.routes';
import { quotaRouter } from '../modules/quota/quota.routes';
import { removalRouter } from '../modules/removal/removal.routes';

/** As rotas de cada módulo. A remoção e a cota declaram os caminhos completos (/playlist/:id/remove-duplicates, /jobs, /quota). */
const routes = Router();

routes.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
routes.use('/playlist', playlistRouter);
routes.use('/auth', authRouter);
routes.use(removalRouter);
routes.use(quotaRouter);

// Rotas de apoio para validação manual. Desligadas por padrão.
if (setting('ENABLE_DEV_ROUTES')) {
    routes.use('/dev', devRouter);
}

export { routes };
