import { Router } from 'express';
import { authRouter } from '../routes/auth.routes';
import { playlistRouter } from '../routes/playlist.routes';

const routes = Router();

routes.use('/playlist', playlistRouter);
routes.use('/auth', authRouter);

export { routes };
