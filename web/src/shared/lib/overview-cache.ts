import type { DuplicatesOverview } from '../api/api.types';
import type { CachedOverview } from './overview-cache.types';

// A análise de todas as playlists gasta cota; a última fica guardada nesta aba do navegador.
const KEY = 'youtoba:overview';

export function readOverview(): CachedOverview | undefined {
    try {
        const raw = sessionStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as CachedOverview) : undefined;
    } catch {
        return undefined;
    }
}

export function saveOverview(overview: DuplicatesOverview, now = new Date()) {
    try {
        sessionStorage.setItem(KEY, JSON.stringify({ overview, savedAt: now.toISOString() }));
    } catch {
        // Sem storage (aba privada, cota cheia): a análise só não fica guardada.
    }
}

export function markOverviewStale() {
    const cached = readOverview();
    if (!cached) return;
    try {
        sessionStorage.setItem(KEY, JSON.stringify({ ...cached, stale: true }));
    } catch {
        // idem
    }
}

export const clearOverview = () => {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        // idem
    }
};

export const findPlaylist = (playlistId: string) =>
    readOverview()?.overview.playlists.find((p) => p.playlistId === playlistId);

export const playlistTitle = (playlistId: string, fallback = playlistId) =>
    findPlaylist(playlistId)?.titulo ?? fallback;
