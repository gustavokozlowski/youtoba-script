import { apiFailure } from '../../infra/youtube/api-failure';
import type { YoutubeClient } from '../../infra/youtube/youtube.client';
import { toEntries } from '../playlist/duplicates';
import type { PlaylistBackup, RestoreResult } from './removal.types';

/**
 * Devolve à playlist os itens que a remoção apagou, na posição original quando a playlist permite.
 * Idempotente: só readiciona um vídeo se hoje há menos cópias dele do que havia no backup.
 */
export async function restoreRemoved(
    client: Pick<YoutubeClient, 'listPlaylistItems' | 'addVideoToPlaylist'>,
    backup: PlaylistBackup,
): Promise<RestoreResult> {
    const result: RestoreResult = { restored: [], skipped: [], failed: [] };
    const removedIds = new Set(backup.removal?.removed ?? []);
    const toRestore = backup.items
        .filter((item) => removedIds.has(item.playlistItemId))
        .sort((a, b) => a.position - b.position);

    if (toRestore.length === 0) {
        return result;
    }

    const countBy = (videoIds: string[]) =>
        videoIds.reduce((counts, id) => counts.set(id, (counts.get(id) ?? 0) + 1), new Map<string, number>());

    const expected = countBy(backup.items.map((item) => item.videoId));
    const current = countBy(toEntries(await client.listPlaylistItems(backup.playlistId)).map((e) => e.videoId));

    for (const item of toRestore) {
        if ((current.get(item.videoId) ?? 0) >= (expected.get(item.videoId) ?? 0)) {
            result.skipped.push({ videoId: item.videoId, position: item.position, reason: 'already_present' });
            continue;
        }

        try {
            await client.addVideoToPlaylist(backup.playlistId, item.videoId, item.position);
            result.restored.push({ videoId: item.videoId, position: item.position, atOriginalPosition: true });
        } catch (error) {
            const failure = apiFailure(error);
            // Playlists com ordenação automática não aceitam posição: adiciona no fim.
            if (failure.reason === 'manualSortRequired' || failure.status === 400) {
                try {
                    await client.addVideoToPlaylist(backup.playlistId, item.videoId);
                    result.restored.push({ videoId: item.videoId, position: item.position, atOriginalPosition: false });
                } catch (retryError) {
                    const { status, reason } = apiFailure(retryError);
                    result.failed.push({ videoId: item.videoId, position: item.position, status, reason });
                    continue;
                }
            } else {
                result.failed.push({ videoId: item.videoId, position: item.position, ...failure });
                continue;
            }
        }
        current.set(item.videoId, (current.get(item.videoId) ?? 0) + 1);
    }

    return result;
}
