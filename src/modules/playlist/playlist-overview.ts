import { apiFailure } from '../../infra/youtube/api-failure';
import { PAGE_SIZE, QUOTA_COST } from '../../infra/youtube/youtube.constants';
import type { Playlist } from '../../infra/youtube/youtube-api.types';
import type {
    OverviewAnalysis,
    PlaylistDuplicateSummary,
    PlaylistItemLister,
    PlaylistReadResult,
} from './playlist.types';
import { summarizePlaylist } from './playlist-summary';

/** Playlists lidas ao mesmo tempo na análise geral: acelera sem disparar rajadas contra a API. */
export const OVERVIEW_CONCURRENT_PLAYLISTS = 2;

/** Só playlists com 2 itens ou mais podem ter duplicados. */
export const analyzable = (playlists: Playlist[]) =>
    playlists.filter((playlist) => (playlist.contentDetails?.itemCount ?? 0) >= 2);

/** Unidades de quota para ler todas as páginas dessas playlists. */
export const analysisEstimate = (playlists: Playlist[]) =>
    playlists.reduce(
        (sum, playlist) => sum + Math.ceil((playlist.contentDetails?.itemCount ?? 0) / PAGE_SIZE) * QUOTA_COST.list,
        0,
    );

/** Lê uma playlist e devolve o resumo ou o motivo da falha, sem lançar. */
async function readPlaylist(client: PlaylistItemLister, playlist: Playlist): Promise<PlaylistReadResult> {
    try {
        return { ok: true, summary: summarizePlaylist(playlist, await client.listPlaylistItems(playlist.id)) };
    } catch (error) {
        const { reason, status } = apiFailure(error);
        const title = playlist.snippet?.title ?? playlist.id;
        return {
            ok: false,
            failure: { playlistId: playlist.id, title, reason: reason ?? String(status ?? 'unknown') },
        };
    }
}

function recordResult(analysis: OverviewAnalysis, result: PlaylistReadResult) {
    if (result.ok) {
        analysis.summaries.push(result.summary);
        return;
    }
    analysis.failed.push(result.failure);
    if (result.failure.reason === 'quotaExceeded') analysis.stoppedByQuota = true;
}

/**
 * Lê as playlists em lotes de OVERVIEW_CONCURRENT_PLAYLISTS, mantendo a ordem do resultado.
 * Se a quota acabar num lote, os lotes seguintes não são lidos.
 */
export async function summarizeEach(client: PlaylistItemLister, playlists: Playlist[]): Promise<OverviewAnalysis> {
    const analysis: OverviewAnalysis = { summaries: [], failed: [], stoppedByQuota: false };
    for (let start = 0; start < playlists.length && !analysis.stoppedByQuota; start += OVERVIEW_CONCURRENT_PLAYLISTS) {
        const batch = playlists.slice(start, start + OVERVIEW_CONCURRENT_PLAYLISTS);
        const results = await Promise.all(batch.map((playlist) => readPlaylist(client, playlist)));
        for (const result of results) recordResult(analysis, result);
    }
    return analysis;
}

const sumOf = (summaries: PlaylistDuplicateSummary[], pick: (summary: PlaylistDuplicateSummary) => number) =>
    summaries.reduce((sum, summary) => sum + pick(summary), 0);

/** As playlists mostradas (com duplicados ou apagados, ou todas), da mais suja para a mais limpa, e os totais. */
export function overviewTotals(summaries: PlaylistDuplicateSummary[], includeAll: boolean) {
    const withDuplicates = summaries.filter((summary) => summary.duplicates > 0);
    const withDeleted = summaries.filter((summary) => summary.deleted > 0);
    const shown = (includeAll ? summaries : summaries.filter((s) => s.duplicates > 0 || s.deleted > 0)).sort(
        (a, b) => b.duplicates - a.duplicates || b.deleted - a.deleted || a.title.localeCompare(b.title),
    );
    return {
        playlists: shown,
        withDuplicates: withDuplicates.length,
        totalDuplicates: sumOf(withDuplicates, (summary) => summary.duplicates),
        totalRemovalCost: sumOf(withDuplicates, (summary) => summary.removalCost),
        withDeleted: withDeleted.length,
        totalDeleted: sumOf(withDeleted, (summary) => summary.deleted),
    };
}
