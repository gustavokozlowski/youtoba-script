import { Router } from 'express';
import { removeDuplicatedItems, removeUnavailableItems, restoreBackup } from './removal.controller';

const removalRouter = Router();

removalRouter.delete('/playlist/:playlistId/remove-duplicates', removeDuplicatedItems);
removalRouter.delete('/playlist/:playlistId/remove-unavailable', removeUnavailableItems);
removalRouter.post('/backups/:backupId/restore', restoreBackup);

export { removalRouter };
