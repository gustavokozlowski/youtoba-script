import { apiFailure } from '../../infra/youtube/api-failure';
import { PAGE_SIZE, QUOTA_COST } from '../../infra/youtube/youtube.constants';
import type { Playlist } from '../../infra/youtube/youtube-api.types';
import type { OverviewAnalysis, PlaylistDuplicateSummary, PlaylistItemLister } from './playlist.types';
import { summarizePlaylist } from './playlist-summary';

const OVERVIEW_CONCURRENT_PLAYLISTS = 2;

/** Só playlists com 2 itens ou mais podem ter duplicados. */
export const analyzable = (playlists: Playlist[]) =>
    playlists.filter((playlist) => (playlist.contentDetails?.itemCount ?? 0) >= 2);

/** Unidades de quota para ler todas as páginas dessas playlists. */
export const analysisEstimate = (playlists: Playlist[]) =>
    playlists.reduce(
        (sum, playlist) => sum + Math.ceil((playlist.contentDetails?.itemCount ?? 0) / PAGE_SIZE) * QUOTA_COST.list,
        0,
    );

/** Lê lotes de playlists em paralelo e para o lote seguinte se a quota acabar no meio. */
export async function summarizeEach(client: PlaylistItemLister, playlists: Playlist[]): Promise<OverviewAnalysis> {
    const analysis: OverviewAnalysis = { summaries: [], failed: [], stoppedByQuota: false };
    for (let start = 0; start < playlists.length; start += OVERVIEW_CONCURRENT_PLAYLISTS) {
        const batch = await Promise.all(
            playlists.slice(start, start + OVERVIEW_CONCURRENT_PLAYLISTS).map(async (playlist) => {
                try {
                    return {
                        playlist,
                        summary: summarizePlaylist(playlist, await client.listPlaylistItems(playlist.id)),
                        failureReason: undefined,
                    };
                } catch (error) {
                    const { reason, status } = apiFailure(error);
                    return {
                        playlist,
                        failureReason: reason ?? String(status ?? 'unknown'),
                        summary: undefined,
                    };
                }
            }),
        );

        for (const result of batch) {
            if (result.summary) {
                analysis.summaries.push(result.summary);
            } else {
                const title = result.playlist.snippet?.title ?? result.playlist.id;
                analysis.failed.push({
                    playlistId: result.playlist.id,
                    title,
                    reason: result.failureReason ?? 'unknown',
                });
                if (result.failureReason === 'quotaExceeded') analysis.stoppedByQuota = true;
            }
        }
        if (analysis.stoppedByQuota) break;
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
