import { describe, expect, it } from 'vitest';
import type { PlaylistBackup } from '../src/services/youtube/backup';
import { restoreRemoved } from '../src/services/youtube/restore';

const apiItem = (videoId: string, position: number) => ({
    id: `now-${position}`,
    kind: '',
    etag: '',
    snippet: { position, title: videoId },
    contentDetails: { videoId },
});

// Playlist original: A B A C B. A remoção apagou o A da posição 2 e o B da posição 4.
const backup: PlaylistBackup = {
    version: 1,
    playlistId: 'PLtest',
    createdAt: '2026-11-19T00:00:00.000Z',
    itemCount: 5,
    items: ['A', 'B', 'A', 'C', 'B'].map((videoId, position) => ({
        playlistItemId: `orig-${position}`,
        videoId,
        title: videoId,
        position,
    })),
    removal: { removed: ['orig-2', 'orig-4'], failed: [], finishedAt: '2026-11-19T00:01:00.000Z' },
};

function fakeClient(current: string[], { rejectPositions = false } = {}) {
    const inserts: { videoId: string; position?: number }[] = [];
    return {
        inserts,
        listPlaylistItems: async () => current.map((videoId, position) => apiItem(videoId, position)) as any,
        addVideoToPlaylist: async (_playlistId: string, videoId: string, position?: number) => {
            if (rejectPositions && position !== undefined) {
                throw Object.assign(new Error('400'), {
                    response: { status: 400, data: { error: { errors: [{ reason: 'manualSortRequired' }] } } },
                });
            }
            inserts.push({ videoId, position });
            current.push(videoId);
            return {} as any;
        },
    };
}

describe('restoreRemoved', () => {
    it('devolve os itens removidos nas posições originais', async () => {
        const client = fakeClient(['A', 'B', 'C']);
        const result = await restoreRemoved(client, backup);
        expect(client.inserts).toEqual([
            { videoId: 'A', position: 2 },
            { videoId: 'B', position: 4 },
        ]);
        expect(result.restored).toHaveLength(2);
        expect(result.failed).toEqual([]);
    });

    it('é idempotente: rodar de novo não duplica nada', async () => {
        const client = fakeClient(['A', 'B', 'A', 'C', 'B']);
        const result = await restoreRemoved(client, backup);
        expect(client.inserts).toEqual([]);
        expect(result.skipped).toHaveLength(2);
    });

    it('em playlist com ordenação automática, adiciona no fim', async () => {
        const client = fakeClient(['A', 'B', 'C'], { rejectPositions: true });
        const result = await restoreRemoved(client, backup);
        expect(client.inserts).toEqual([{ videoId: 'A' }, { videoId: 'B' }]);
        expect(result.restored.every((r) => !r.atOriginalPosition)).toBe(true);
    });

    it('não faz nada quando o backup não registra remoção', async () => {
        const client = fakeClient(['A']);
        expect(await restoreRemoved(client, { ...backup, removal: undefined })).toEqual({
            restored: [],
            skipped: [],
            failed: [],
        });
    });
});
