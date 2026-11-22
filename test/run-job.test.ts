import { describe, expect, it, vi } from 'vitest';
import type { RunnableJob } from '../src/modules/jobs/job.types';
import { runJob } from '../src/modules/jobs/run-job';

const newJob = (): RunnableJob => ({ id: 'job-12345678', status: 'running' });
const stubLog = () => ({ info: vi.fn(), error: vi.fn() });
const baseParams = (log = stubLog()) => ({
    log,
    messages: { start: 'start', end: 'end' },
    startFields: {},
    endFields: () => ({}),
});

describe('runJob', () => {
    it('finishes with the right status even when the record write throws on every call', async () => {
        const job = newJob();
        const log = stubLog();
        const record = vi.fn(() => {
            throw new Error('disk full');
        });

        await expect(
            runJob(job, {
                ...baseParams(log),
                record,
                execute: async (saveProgress) => {
                    saveProgress();
                    saveProgress();
                    return [{ id: 'v1', reason: 'skipped_daily_budget' }];
                },
            }),
        ).resolves.toBeUndefined();

        expect(job).toMatchObject({ status: 'partial', stopReason: 'daily_budget' });
        expect(job.finishedAt).toBeDefined();
        expect(record).toHaveBeenCalledTimes(3);
        expect(log.error).toHaveBeenCalledTimes(3);
    });

    it('marks the job as failed when execute throws, and still records the end', async () => {
        const job = newJob();
        const record = vi.fn();

        await runJob(job, {
            ...baseParams(),
            record,
            execute: async () => {
                throw new Error('boom');
            },
        });

        expect(job).toMatchObject({ status: 'failed', error: 'boom' });
        expect(job.finishedAt).toBeDefined();
        expect(record).toHaveBeenCalledWith(true);
    });

    it('is done when nothing failed', async () => {
        const job = newJob();
        await runJob(job, { ...baseParams(), record: vi.fn(), execute: async () => [] });
        expect(job.status).toBe('done');
    });
});
