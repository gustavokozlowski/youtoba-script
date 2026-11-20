import { apiFailure } from '../../infra/youtube/api-failure';
import type { YoutubeClient } from '../../infra/youtube/youtube.client';
import { PAGE_SIZE, QUOTA_COST } from '../../infra/youtube/youtube.constants';
import type { Playlist } from '../../infra/youtube/youtube-api.types';
import type { OverviewAnalysis, PlaylistDuplicateSummary } from './playlist.types';
import { summarizePlaylist } from './playlist-summary';

/** Só playlists com 2 itens ou mais podem ter duplicados. */
export const analyzable = (playlists: Playlist[]) =>
    playlists.filter((playlist) => (playlist.contentDetails?.itemCount ?? 0) >= 2);

/** Unidades de quota para ler todas as páginas dessas playlists. */
export const analysisEstimate = (playlists: Playlist[]) =>
    playlists.reduce(
        (sum, playlist) => sum + Math.ceil((playlist.contentDetails?.itemCount ?? 0) / PAGE_SIZE) * QUOTA_COST.list,
        0,
    );

/** Lê e resume uma playlist por vez; se a quota acabar no meio, para e devolve o que já foi analisado. */
export async function summarizeEach(client: YoutubeClient, playlists: Playlist[]): Promise<OverviewAnalysis> {
    const analysis: OverviewAnalysis = { summaries: [], failed: [], stoppedByQuota: false };
    for (const playlist of playlists) {
        try {
            analysis.summaries.push(summarizePlaylist(playlist, await client.listPlaylistItems(playlist.id)));
        } catch (error) {
            const { reason, status } = apiFailure(error);
            const title = playlist.snippet?.title ?? playlist.id;
            analysis.failed.push({ playlistId: playlist.id, title, reason: reason ?? String(status ?? 'unknown') });
            if (reason === 'quotaExceeded') {
                analysis.stoppedByQuota = true;
                break;
            }
        }
    }
    return analysis;
}

/** As playlists mostradas (as com duplicados, ou todas), da mais suja para a mais limpa, e os totais. */
export function overviewTotals(summaries: PlaylistDuplicateSummary[], includeAll: boolean) {
    const withDuplicates = summaries.filter((summary) => summary.duplicates > 0);
    const shown = (includeAll ? summaries : withDuplicates).sort(
        (a, b) => b.duplicates - a.duplicates || a.title.localeCompare(b.title),
    );
    return {
        playlists: shown,
        withDuplicates: withDuplicates.length,
        totalDuplicates: withDuplicates.reduce((sum, summary) => sum + summary.duplicates, 0),
        totalRemovalCost: withDuplicates.reduce((sum, summary) => sum + summary.removalCost, 0),
    };
}
