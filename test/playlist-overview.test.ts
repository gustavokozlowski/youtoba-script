import { describe, expect, it } from 'vitest';
import type { PlaylistDuplicateSummary, PlaylistItemLister } from '../src/modules/playlist/playlist.types';
import {
    OVERVIEW_CONCURRENT_PLAYLISTS,
    overviewTotals,
    summarizeEach,
} from '../src/modules/playlist/playlist-overview';
import { playlist, playlistItem } from './helpers/youtube-fixtures';
import type { SummaryFixture } from './playlist-overview.types';

const quotaExceeded = { response: { status: 403, data: { error: { errors: [{ reason: 'quotaExceeded' }] } } } };
const notFound = { response: { status: 404, data: { error: { errors: [{ reason: 'playlistNotFound' }] } } } };

const playlists = (...ids: string[]) => ids.map((id) => playlist({ id, title: `Playlist ${id}` }));

/** Cliente falso: cada playlist tem um vídeo repetido; as de `errors` falham com o erro dado. */
function fakeLister(errors: Record<string, unknown> = {}) {
    const requested: string[] = [];
    let active = 0;
    let peak = 0;
    const client: PlaylistItemLister = {
        async listPlaylistItems(playlistId) {
            requested.push(playlistId);
            active++;
            peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active--;
            if (errors[playlistId]) throw errors[playlistId];
            return [0, 1].map((position) => playlistItem({ id: `${playlistId}-${position}`, videoId: 'v', position }));
        },
    };
    return { client, requested, peak: () => peak };
}

describe('summarizeEach', () => {
    it('reads at most OVERVIEW_CONCURRENT_PLAYLISTS at a time and keeps the playlist order', async () => {
        const lister = fakeLister();

        const result = await summarizeEach(lister.client, playlists('a', 'b', 'c', 'd', 'e'));

        expect(lister.peak()).toBe(OVERVIEW_CONCURRENT_PLAYLISTS);
        expect(result.summaries.map((summary) => summary.playlistId)).toEqual(['a', 'b', 'c', 'd', 'e']);
        expect(result.summaries.every((summary) => summary.duplicates === 1)).toBe(true);
        expect(result).toMatchObject({ failed: [], stoppedByQuota: false });
    });

    it('stops before the next batch when the quota runs out, keeping what was already read', async () => {
        const lister = fakeLister({ b: quotaExceeded });

        const result = await summarizeEach(lister.client, playlists('a', 'b', 'c', 'd'));

        expect(lister.requested).toEqual(['a', 'b']);
        expect(result.summaries.map((summary) => summary.playlistId)).toEqual(['a']);
        expect(result.failed).toEqual([{ playlistId: 'b', title: 'Playlist b', reason: 'quotaExceeded' }]);
        expect(result.stoppedByQuota).toBe(true);
    });

    it('records other failures and keeps reading the remaining playlists', async () => {
        const lister = fakeLister({ a: notFound, c: new Error('socket hang up') });

        const result = await summarizeEach(lister.client, playlists('a', 'b', 'c'));

        expect(result.summaries.map((summary) => summary.playlistId)).toEqual(['b']);
        expect(result.failed).toEqual([
            { playlistId: 'a', title: 'Playlist a', reason: 'playlistNotFound' },
            { playlistId: 'c', title: 'Playlist c', reason: 'unknown' },
        ]);
        expect(result.stoppedByQuota).toBe(false);
    });
});

/** Resumo completo com só os números que os totais leem. */
const summary = ({ playlistId, title, duplicates, deleted }: SummaryFixture): PlaylistDuplicateSummary => ({
    playlistId,
    title,
    link: `https://www.youtube.com/playlist?list=${playlistId}`,
    coverSource: 'none',
    totalVideos: 10,
    afterRemoval: 10 - duplicates,
    duplicates,
    duplicatePercent: duplicates * 10,
    unavailable: deleted,
    deleted,
    mostRepeated: [],
    removalCost: duplicates * 50,
});

const mixed = () => [
    summary({ playlistId: 'clean', title: 'Clean', duplicates: 0, deleted: 0 }),
    summary({ playlistId: 'only-deleted', title: 'Only deleted', duplicates: 0, deleted: 4 }),
    summary({ playlistId: 'only-dups', title: 'Only dups', duplicates: 2, deleted: 0 }),
    summary({ playlistId: 'both-b', title: 'B both', duplicates: 2, deleted: 1 }),
    summary({ playlistId: 'both-a', title: 'A both', duplicates: 2, deleted: 1 }),
    summary({ playlistId: 'more-dups', title: 'More dups', duplicates: 5, deleted: 0 }),
];

describe('overviewTotals', () => {
    it('shows playlists with duplicates or deleted videos, sorted by duplicates, then deleted, then title', () => {
        const totals = overviewTotals(mixed(), false);

        expect(totals.playlists.map((p) => p.playlistId)).toEqual([
            'more-dups',
            'both-a',
            'both-b',
            'only-dups',
            'only-deleted',
        ]);
    });

    it('with includeAll, also shows the clean playlists', () => {
        const totals = overviewTotals(mixed(), true);

        expect(totals.playlists.map((p) => p.playlistId)).toEqual([
            'more-dups',
            'both-a',
            'both-b',
            'only-dups',
            'only-deleted',
            'clean',
        ]);
    });

    it('counts deleted videos in new totals and keeps the duplicate totals unchanged', () => {
        const totals = overviewTotals(mixed(), false);

        expect(totals).toMatchObject({
            withDuplicates: 4,
            totalDuplicates: 11,
            totalRemovalCost: 550,
            withDeleted: 3,
            totalDeleted: 6,
        });
    });
});
