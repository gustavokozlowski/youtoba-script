import type { PlaylistItem } from '../../infra/youtube/youtube-api.types';
import { availabilityOf } from './availability';
import type { DuplicateEntry, PlaylistEntry } from './playlist.types';

export function toEntry(item: PlaylistItem, fallbackPosition: number): PlaylistEntry | undefined {
    const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
    if (!videoId) {
        return undefined;
    }
    const unavailable = availabilityOf(item);
    return {
        playlistItemId: item.id,
        videoId,
        title: item.snippet?.title ?? '',
        position: item.snippet?.position ?? fallbackPosition,
        channel: item.snippet?.videoOwnerChannelTitle,
        ...(unavailable ? { unavailable } : {}),
    };
}

export const toEntries = (items: PlaylistItem[]): PlaylistEntry[] =>
    items.flatMap((item, index) => toEntry(item, index) ?? []);

/**
 * Duplicado = o mesmo vídeo (mesmo videoId) aparecendo mais de uma vez.
 * Fica a primeira ocorrência pela posição na playlist; as seguintes são duplicadas. O(n).
 */
export function findDuplicates(entries: PlaylistEntry[]): { unique: PlaylistEntry[]; duplicates: DuplicateEntry[] } {
    const firstByVideo = new Map<string, PlaylistEntry>();
    const unique: PlaylistEntry[] = [];
    const duplicates: DuplicateEntry[] = [];

    for (const entry of [...entries].sort((a, b) => a.position - b.position)) {
        const first = firstByVideo.get(entry.videoId);
        if (first) {
            duplicates.push({ ...entry, firstPosition: first.position });
        } else {
            firstByVideo.set(entry.videoId, entry);
            unique.push(entry);
        }
    }

    return { unique, duplicates };
}
