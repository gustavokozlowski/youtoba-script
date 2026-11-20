import { Router } from 'express';
import { getRemovalJob, listRemovalJobs, removeDuplicatedItems } from './removal.controller';

const removalRouter = Router();

removalRouter.delete('/playlist/:playlistId/remove-duplicates', removeDuplicatedItems);
removalRouter.get('/jobs', listRemovalJobs);
removalRouter.get('/jobs/:jobId', getRemovalJob);

export { removalRouter };
