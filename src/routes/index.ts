import { Router } from 'express';
import { authRouter } from '../routes/auth.routes';
import { playlistRouter } from '../routes/playlist.routes';
import { authMiddleware } from '../middlewares/auth.middleware';

const routes = Router();

routes.use('/playlist', playlistRouter);
routes.use('/auth', authRouter);
routes.use(authMiddleware);

export { routes };
