import type { Request, Response } from 'express';
import { formatQuotaSnapshot } from './quota.formatter';
import { quotaTracker } from './quota-tracker.service';

export const getQuota = (_req: Request, res: Response) => {
    res.status(200).json(formatQuotaSnapshot(quotaTracker().snapshot()));
};
