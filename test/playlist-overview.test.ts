import { describe, expect, it } from 'vitest';
import type { Playlist } from '../src/infra/youtube/youtube-api.types';
import type { PlaylistItemLister } from '../src/modules/playlist/playlist.types';
import { summarizeEach } from '../src/modules/playlist/playlist-overview';

const playlist = (id: string, title: string): Playlist =>
    ({
        id,
        snippet: { title, thumbnails: {} },
        contentDetails: { itemCount: 2 },
    }) as Playlist;

describe('análise das playlists', () => {
    it('lê em lote limitado e mantém o resultado na ordem das playlists', async () => {
        let active = 0;
        let peak = 0;
        const client: PlaylistItemLister = {
            async listPlaylistItems(playlistId) {
                active++;
                peak = Math.max(peak, active);
                await new Promise((resolve) => setTimeout(resolve, 5));
                active--;
                return [
                    {
                        kind: 'youtube#playlistItem',
                        etag: `${playlistId}-etag-1`,
                        id: `${playlistId}-1`,
                        snippet: {
                            publishedAt: '2026-11-20T00:00:00Z',
                            channelId: 'channel',
                            description: '',
                            thumbnails: {},
                            channelTitle: 'Canal',
                            videoOwnerChannelTitle: 'Canal',
                            videoOwnerChannelId: 'channel',
                            playlistId,
                            position: 0,
                            title: `Vídeo ${playlistId}`,
                            resourceId: { kind: 'youtube#video', videoId: `video-${playlistId}` },
                        },
                        contentDetails: { videoId: `video-${playlistId}`, videoPublishedAt: '2026-11-20T00:00:00Z' },
                    },
                    {
                        kind: 'youtube#playlistItem',
                        etag: `${playlistId}-etag-2`,
                        id: `${playlistId}-2`,
                        snippet: {
                            publishedAt: '2026-11-20T00:00:00Z',
                            channelId: 'channel',
                            description: '',
                            thumbnails: {},
                            channelTitle: 'Canal',
                            videoOwnerChannelTitle: 'Canal',
                            videoOwnerChannelId: 'channel',
                            playlistId,
                            position: 1,
                            title: `Vídeo ${playlistId}`,
                            resourceId: { kind: 'youtube#video', videoId: `video-${playlistId}` },
                        },
                        contentDetails: { videoId: `video-${playlistId}`, videoPublishedAt: '2026-11-20T00:00:00Z' },
                    },
                ];
            },
        };

        const result = await summarizeEach(client, [
            playlist('PL-a', 'A'),
            playlist('PL-b', 'B'),
            playlist('PL-c', 'C'),
            playlist('PL-d', 'D'),
            playlist('PL-e', 'E'),
        ]);

        expect(peak).toBeGreaterThan(1);
        expect(peak).toBeLessThanOrEqual(4);
        expect(result.summaries.map((summary) => summary.playlistId)).toEqual(['PL-a', 'PL-b', 'PL-c', 'PL-d', 'PL-e']);
        expect(result.failed).toEqual([]);
        expect(result.stoppedByQuota).toBe(false);
    });
});
