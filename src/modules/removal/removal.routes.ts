import { Router } from 'express';
import {
    getRemovalJob,
    listRemovalJobs,
    removeDuplicatedItems,
    removeUnavailableItems,
    restoreBackup,
} from './removal.controller';

const removalRouter = Router();

removalRouter.delete('/playlist/:playlistId/remove-duplicates', removeDuplicatedItems);
removalRouter.delete('/playlist/:playlistId/remove-unavailable', removeUnavailableItems);
removalRouter.get('/jobs', listRemovalJobs);
removalRouter.get('/jobs/:jobId', getRemovalJob);
removalRouter.post('/backups/:backupId/restore', restoreBackup);

export { removalRouter };
