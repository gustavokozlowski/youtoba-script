import { Router } from 'express';
import { getJob, listJobs } from './jobs.controller';

const jobsRouter = Router();

jobsRouter.get('/jobs', listJobs);
jobsRouter.get('/jobs/:jobId', getJob);

export { jobsRouter };
