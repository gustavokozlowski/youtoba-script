import nock from 'nock';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { YoutubeClient } from '../src/infra/youtube/youtube.client';

const insertBody = (id: string, videoId: string) => ({
    kind: 'youtube#playlistItem',
    etag: 'e',
    id,
    snippet: { playlistId: 'PL1', position: 0, resourceId: { kind: 'youtube#video', videoId } },
});

const client = (onCost?: (units: number) => void) =>
    new YoutubeClient({ apiKey: 'key', token: 'tok' }, { retries: 0, baseDelayMs: 1, onCost });

describe('YoutubeClient.addVideosToPlaylist', () => {
    beforeAll(() => nock.disableNetConnect());
    afterEach(() => nock.cleanAll());

    it('appends one by one and reports the created playlistItemId', async () => {
        const api = nock('https://youtube.googleapis.com');
        api.post('/youtube/v3/playlistItems').query(true).reply(200, insertBody('item-a', 'A'));
        api.post('/youtube/v3/playlistItems')
            .query(true)
            .reply(403, {
                error: { code: 403, errors: [{ reason: 'quotaExceeded' }] },
            });
        const result = await client().addVideosToPlaylist('PL1', ['A', 'B', 'C']);
        expect(result.added).toEqual([{ videoId: 'A', playlistItemId: 'item-a' }]);
        expect(result.failed).toEqual([
            { id: 'B', status: 403, reason: 'quotaExceeded' },
            { id: 'C', reason: 'skipped_quota_exceeded' },
        ]);
    });
});
