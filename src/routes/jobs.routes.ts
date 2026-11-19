import { Router } from 'express';
import { getRemovalJob, listRemovalJobs } from '../controllers/playlist.controller';

const jobsRouter = Router();

jobsRouter.get('/', listRemovalJobs);
jobsRouter.get('/:jobId', getRemovalJob);

export { jobsRouter };
