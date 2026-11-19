import { Router } from 'express';
import { getRemovalJob } from '../controllers/playlist.controller';

const jobsRouter = Router();

jobsRouter.get('/:jobId', getRemovalJob);

export { jobsRouter };
