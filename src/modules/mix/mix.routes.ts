import { Router } from 'express';
import { previewMix, startMix, undoMix } from './mix.controller';

const mixRouter = Router();

mixRouter.get('/playlist/:playlistId/mix', previewMix);
mixRouter.post('/playlist/:playlistId/mix', startMix);
mixRouter.post('/mixes/:recordId/undo', undoMix);

export { mixRouter };
