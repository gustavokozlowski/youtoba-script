import { Router } from 'express';
import { previewMix, startMix } from './mix.controller';

const mixRouter = Router();

mixRouter.get('/playlist/:playlistId/mix', previewMix);
mixRouter.post('/playlist/:playlistId/mix', startMix);

export { mixRouter };
