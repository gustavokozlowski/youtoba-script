import { Router } from 'express';
import { getRemovalJob, listRemovalJobs } from '../playlist/playlist.controller';

const jobsRouter = Router();

jobsRouter.get('/', listRemovalJobs);
jobsRouter.get('/:jobId', getRemovalJob);

export { jobsRouter };
