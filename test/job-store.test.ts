import { describe, expect, it } from 'vitest';
import { JobStore } from '../src/modules/jobs/job-store';
import type { StoredJob } from '../src/modules/jobs/job-store.types';

const job = (id: string, playlistId: string, status = 'running'): StoredJob => ({ id, playlistId, status });

describe('JobStore', () => {
    it('lists the newest job first', () => {
        const store = new JobStore<StoredJob>();
        store.track(job('1', 'PL1'), Promise.resolve());
        store.track(job('2', 'PL1'), Promise.resolve());
        expect(store.list().map((j) => j.id)).toEqual(['2', '1']);
        expect(store.get('1')?.id).toBe('1');
        expect(store.get('nope')).toBeUndefined();
    });

    it('runningFor only returns running jobs of that playlist', () => {
        const store = new JobStore<StoredJob>();
        store.track(job('1', 'PL1', 'done'), Promise.resolve());
        store.track(job('2', 'PL2'), Promise.resolve());
        expect(store.runningFor('PL1')).toBeUndefined();
        expect(store.runningFor('PL2')?.id).toBe('2');
        store.track(job('3', 'PL1'), Promise.resolve());
        expect(store.runningFor('PL1')?.id).toBe('3');
    });

    it('settled resolves after the tracked promise', async () => {
        const store = new JobStore<StoredJob>();
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        let done = false;
        store.track(job('1', 'PL1'), gate);
        const waiting = store.settled('1').then(() => {
            done = true;
        });
        await Promise.resolve();
        expect(done).toBe(false);
        release();
        await waiting;
        expect(done).toBe(true);
    });

    it('settled resolves right away for an unknown id', async () => {
        await expect(new JobStore<StoredJob>().settled('x')).resolves.toBeUndefined();
    });
});
