import { QUOTA_COST } from '../../infra/youtube/youtube.constants';
import type { PlaylistsResponse } from '../../infra/youtube/youtube-api.types';
import { estimateRemovalQuota } from '../quota/quota-estimate';
import { type QuotaTracker, quotaTracker } from '../quota/quota-tracker.service';
import { connectedClient } from '../quota/tracked-client';
import type { ClientFactory } from '../quota/tracked-client.types';
import { findDuplicates, toEntries } from './duplicates';
import type {
    DuplicatesOverviewResult,
    DuplicatesPreview,
    PlaylistEntry,
    QuotaToday,
    ReadFailure,
    RemovalPreviewBase,
    UnavailablePreview,
} from './playlist.types';
import { analysisEstimate, analyzable, overviewTotals, summarizeEach } from './playlist-overview';
import { readFailure } from './read-failure';
import { findDeleted } from './unavailable';

/** Leituras de playlists: listas, itens, dry-run dos duplicados e a análise de todas as playlists. */
export class PlaylistService {
    constructor(
        private readonly createClient: ClientFactory = connectedClient,
        private readonly tracker: () => QuotaTracker = quotaTracker,
    ) {}

    async playlists(): Promise<PlaylistsResponse | null> {
        const client = await this.createClient();
        return client ? client.playlists() : null;
    }

    async itemCount(playlistId: string): Promise<ReadFailure | { status: 'ok'; itemCount: number }> {
        const client = await this.createClient();
        if (!client) return { status: 'not_connected' };
        try {
            return { status: 'ok', itemCount: await client.playlistItemCount(playlistId) };
        } catch (error) {
            return readFailure(error);
        }
    }

    async listItems(playlistId: string): Promise<ReadFailure | { status: 'ok'; items: PlaylistEntry[] }> {
        const client = await this.createClient();
        if (!client) return { status: 'not_connected' };
        try {
            return { status: 'ok', items: toEntries(await client.listPlaylistItems(playlistId)) };
        } catch (error) {
            return readFailure(error);
        }
    }

    /** Dry-run: mostra o que seria removido e quanto custaria, sem apagar nada. */
    async previewDuplicates(playlistId: string): Promise<ReadFailure | ({ status: 'ok' } & DuplicatesPreview)> {
        const listed = await this.listItems(playlistId);
        if (listed.status !== 'ok') return listed;
        return { status: 'ok', ...this.preview(playlistId, listed.items) };
    }

    /** Dry-run dos vídeos apagados: o que seria removido e quanto custaria, sem apagar nada. */
    async previewUnavailable(playlistId: string): Promise<ReadFailure | ({ status: 'ok' } & UnavailablePreview)> {
        const listed = await this.listItems(playlistId);
        if (listed.status !== 'ok') return listed;
        return { status: 'ok', ...this.unavailablePreview(playlistId, listed.items) };
    }

    /**
     * Lê todas as playlists do usuário e resume as que têm duplicados (ou todas, com `includeAll`).
     * Estima o custo antes e não começa se não couber no saldo do dia.
     */
    async duplicatesOverview(includeAll = false): Promise<DuplicatesOverviewResult> {
        const tracker = this.tracker();
        if (!tracker.canSpend(QUOTA_COST.list)) return this.budgetExhausted(QUOTA_COST.list);

        const client = await this.createClient();
        if (!client) return { status: 'not_connected' };

        const usedBefore = tracker.used();
        let playlists: Awaited<ReturnType<typeof client.listMyPlaylists>>;
        try {
            playlists = await client.listMyPlaylists();
        } catch (error) {
            const failure = readFailure(error);
            return failure.status === 'not_found' ? { status: 'fetch_failed' } : failure;
        }

        const candidates = analyzable(playlists);
        const estimate = analysisEstimate(candidates);
        if (!tracker.canSpend(estimate)) return this.budgetExhausted(estimate);

        const { summaries, failed, stoppedByQuota } = await summarizeEach(client, candidates);
        return {
            status: 'ok',
            ...overviewTotals(summaries, includeAll),
            analyzed: summaries.length,
            skippedSmall: playlists.length - candidates.length,
            analysisCost: tracker.used() - usedBefore,
            failed,
            stoppedByQuota,
            quotaToday: tracker.snapshot(),
        };
    }

    /** Os duplicados de uma playlist já lida, com a estimativa de custo e o saldo de hoje. */
    preview(playlistId: string, entries: PlaylistEntry[]): DuplicatesPreview {
        const { unique, duplicates } = findDuplicates(entries);
        return {
            ...this.removalPreview(playlistId, entries, duplicates),
            unique: unique.length,
            duplicates,
        };
    }

    /** Os vídeos apagados de uma playlist já lida, com a estimativa de custo e o saldo de hoje. */
    unavailablePreview(playlistId: string, entries: PlaylistEntry[]): UnavailablePreview {
        const deleted = findDeleted(entries);
        return {
            ...this.removalPreview(playlistId, entries, deleted),
            deleted,
        };
    }

    /** O dry-run de uma remoção de alvos já escolhidos em uma playlist já lida. */
    removalPreview(playlistId: string, entries: PlaylistEntry[], targets: PlaylistEntry[]): RemovalPreviewBase {
        return {
            playlistId,
            itemCount: entries.length,
            quota: estimateRemovalQuota(entries.length, targets.length),
            quotaToday: this.quotaToday(),
        };
    }

    private quotaToday(): QuotaToday {
        const today = this.tracker().snapshot();
        return { ...today, deletesPossible: Math.floor(today.remaining / QUOTA_COST.delete) };
    }

    private budgetExhausted(estimate: number) {
        return { status: 'budget_exhausted', estimate, quota: this.tracker().snapshot() } as const;
    }
}
