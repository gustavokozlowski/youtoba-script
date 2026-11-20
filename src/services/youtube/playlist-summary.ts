import { QUOTA_COST } from '../../infra/youtube/youtube.constants';
import type { Playlist, PlaylistItem, YouTubeThumbnails } from '../../infra/youtube/youtube-api.types';
import { findDuplicates, toEntries } from './duplicates';
import type { PlaylistDuplicateSummary } from './youtube.types';

// Títulos que a API devolve para itens cujo vídeo foi apagado ou ficou privado.
const UNAVAILABLE_TITLES = new Set(['Deleted video', 'Private video']);

const THUMBNAIL_PREFERENCE: (keyof YouTubeThumbnails)[] = ['maxres', 'standard', 'high', 'medium', 'default'];

/** A maior imagem disponível. */
export function pickThumbnail(thumbnails: YouTubeThumbnails | undefined): string | undefined {
    for (const size of THUMBNAIL_PREFERENCE) {
        const url = thumbnails?.[size]?.url;
        if (url) return url;
    }
    return undefined;
}

export const playlistLink = (playlistId: string) => `https://www.youtube.com/playlist?list=${playlistId}`;

function pickCover(playlist: Playlist, items: PlaylistItem[]): Pick<PlaylistDuplicateSummary, 'cover' | 'coverSource'> {
    const own = pickThumbnail(playlist.snippet?.thumbnails);
    if (own) return { cover: own, coverSource: 'playlist' };

    const sorted = [...items].sort((a, b) => (a.snippet?.position ?? 0) - (b.snippet?.position ?? 0));
    for (const item of sorted) {
        const fromVideo = pickThumbnail(item.snippet?.thumbnails);
        if (fromVideo) return { cover: fromVideo, coverSource: 'first_video' };
    }
    return { coverSource: 'none' };
}

export function summarizePlaylist(playlist: Playlist, items: PlaylistItem[]): PlaylistDuplicateSummary {
    const entries = toEntries(items);
    const { unique, duplicates } = findDuplicates(entries);

    const copies = new Map<string, { title: string; copies: number }>();
    for (const entry of entries) {
        const current = copies.get(entry.videoId);
        copies.set(entry.videoId, { title: current?.title ?? entry.title, copies: (current?.copies ?? 0) + 1 });
    }
    const mostRepeated = [...copies.entries()]
        .filter(([, info]) => info.copies > 1)
        .sort((a, b) => b[1].copies - a[1].copies)
        .slice(0, 3)
        .map(([videoId, info]) => ({ videoId, ...info }));

    return {
        playlistId: playlist.id,
        title: playlist.snippet?.title ?? playlist.id,
        link: playlistLink(playlist.id),
        ...pickCover(playlist, items),
        privacy: playlist.status?.privacyStatus,
        totalVideos: entries.length,
        afterRemoval: unique.length,
        duplicates: duplicates.length,
        duplicatePercent: entries.length === 0 ? 0 : Math.round((duplicates.length / entries.length) * 1000) / 10,
        unavailable: entries.filter((entry) => UNAVAILABLE_TITLES.has(entry.title)).length,
        mostRepeated,
        removalCost: duplicates.length * QUOTA_COST.delete,
    };
}
