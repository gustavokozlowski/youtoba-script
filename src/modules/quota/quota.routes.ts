import { Router } from 'express';
import { getQuota } from './quota.controller';

const quotaRouter = Router();

quotaRouter.get('/quota', getQuota);

export { quotaRouter };
