import { describe, expect, it } from 'vitest';
import { runOneByOne } from '../src/infra/youtube/one-by-one';
import type { OneByOneProgressEvent } from '../src/infra/youtube/one-by-one.types';
import type { ApiFailure } from '../src/infra/youtube/youtube-api.types';

const ids = ['a', 'b', 'c', 'd'];

/** Tentativa que falha nos ids indicados e conta as chamadas. */
function attemptFailing(failures: Record<string, ApiFailure>) {
    const calls: string[] = [];
    const attempt = async (id: string) => {
        calls.push(id);
        return failures[id];
    };
    return { calls, attempt };
}

describe('runOneByOne', () => {
    it('succeeds on every item', async () => {
        const { calls, attempt } = attemptFailing({});
        const result = await runOneByOne(ids, 50, attempt);
        expect(result).toEqual({ succeeded: ids, failed: [] });
        expect(calls).toEqual(ids);
    });

    it('keeps going after a failure in the middle', async () => {
        const { attempt } = attemptFailing({ b: { status: 404, reason: 'videoNotFound' } });
        const result = await runOneByOne(ids, 50, attempt);
        expect(result.succeeded).toEqual(['a', 'c', 'd']);
        expect(result.failed).toEqual([{ id: 'b', status: 404, reason: 'videoNotFound' }]);
    });

    it('skips from item k on when canSpend says no', async () => {
        const { calls, attempt } = attemptFailing({});
        const spent: number[] = [];
        const canSpend = (units: number) => {
            spent.push(units);
            return spent.length <= 2;
        };
        const result = await runOneByOne(ids, 50, attempt, { canSpend });
        expect(calls).toEqual(['a', 'b']);
        expect(result.succeeded).toEqual(['a', 'b']);
        expect(result.failed).toEqual([
            { id: 'c', reason: 'skipped_daily_budget' },
            { id: 'd', reason: 'skipped_daily_budget' },
        ]);
        expect(spent).toEqual([50, 50, 50]);
    });

    it('stops on quotaExceeded and marks the rest as skipped', async () => {
        const { calls, attempt } = attemptFailing({ b: { status: 403, reason: 'quotaExceeded' } });
        const result = await runOneByOne(ids, 50, attempt);
        expect(calls).toEqual(['a', 'b']);
        expect(result.succeeded).toEqual(['a']);
        expect(result.failed).toEqual([
            { id: 'b', status: 403, reason: 'quotaExceeded' },
            { id: 'c', reason: 'skipped_quota_exceeded' },
            { id: 'd', reason: 'skipped_quota_exceeded' },
        ]);
    });

    it('reports progress with index, total and outcome', async () => {
        const { attempt } = attemptFailing({ b: { status: 409, reason: 'conflict' } });
        const events: OneByOneProgressEvent[] = [];
        await runOneByOne(['a', 'b', 'c'], 50, attempt, { onProgress: (event) => events.push(event) });
        expect(events).toEqual([
            { index: 0, total: 3, itemId: 'a', outcome: 'succeeded' },
            { index: 1, total: 3, itemId: 'b', outcome: 'failed', status: 409, reason: 'conflict' },
            { index: 2, total: 3, itemId: 'c', outcome: 'succeeded' },
        ]);
    });
});
