import { googleAuth } from '../google';
import { writeBackup } from './backup';
import type { PlaylistsResponse } from './client/client.types';
import { createTrackedClient } from './client/tracked-client';
import { apiFailure } from './client/youtube.client';
import { findDuplicates, toEntries } from './duplicates';
import { estimateRemovalQuota } from './quota';
import { type QuotaTracker, quotaTracker } from './quota-tracker';
import { type RemovalJobs, removalJobs } from './removal-jobs';
import { QUOTA_COST } from './youtube.constants';
import type {
    ClientFactory,
    DuplicatesPreview,
    PlaylistEntry,
    ReadFailure,
    RemovalJob,
    RemoveDuplicatesResult,
} from './youtube.types';

// Um client por chamada: o service não guarda token nem client entre requisições.
const defaultClientFactory: ClientFactory = async () => {
    const apiKey = process.env.API_KEY;
    const token = await googleAuth().getAccessToken();
    return token && apiKey ? createTrackedClient({ apiKey, token }) : undefined;
};

function readFailure(error: unknown): ReadFailure {
    const { status, reason } = apiFailure(error);
    if (status === 404 || reason === 'playlistNotFound') return { status: 'not_found' };
    if (reason === 'quotaExceeded') return { status: 'quota_exceeded' };
    console.error(`Falha ao ler a playlist: HTTP ${status ?? '?'} ${reason ?? ''}`);
    return { status: 'fetch_failed' };
}

export class YoutubeService {
    constructor(
        private readonly createClient: ClientFactory = defaultClientFactory,
        private readonly tracker: () => QuotaTracker = quotaTracker,
        private readonly jobs: RemovalJobs = removalJobs,
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
        return { status: 'ok', ...this.buildPreview(playlistId, listed.items) };
    }

    /**
     * Inicia a remoção em segundo plano. Só começa se `confirm` for igual ao número de duplicados encontrados
     * agora e se houver saldo de quota para ao menos um item. Antes de apagar, grava o backup da playlist inteira.
     */
    async removeDuplicates(playlistId: string, confirm: number | undefined): Promise<RemoveDuplicatesResult> {
        const running = this.jobs.runningFor(playlistId);
        if (running) return { status: 'already_running', job: running };

        const tracker = this.tracker();
        if (!tracker.canSpend(QUOTA_COST.list)) return { status: 'budget_exhausted', quota: tracker.snapshot() };

        const client = await this.createClient();
        if (!client) return { status: 'not_connected' };

        let entries: PlaylistEntry[];
        try {
            entries = toEntries(await client.listPlaylistItems(playlistId));
        } catch (error) {
            return readFailure(error);
        }

        const preview = this.buildPreview(playlistId, entries);
        if (preview.duplicates.length === 0) return { status: 'no_duplicates', ...preview };
        if (confirm !== preview.duplicates.length) return { status: 'confirmation_required', ...preview };
        if (preview.quotaToday.deletesPossible === 0) return { status: 'budget_exhausted', quota: tracker.snapshot() };

        const backupFile = writeBackup(playlistId, entries);
        const job = this.jobs.start({ playlistId, duplicates: preview.duplicates, backupFile, client, tracker });

        return {
            status: 'started',
            job,
            fitToday: Math.min(preview.duplicates.length, preview.quotaToday.deletesPossible),
            ...preview,
        };
    }

    job(jobId: string): RemovalJob | undefined {
        return this.jobs.get(jobId);
    }

    private buildPreview(playlistId: string, entries: PlaylistEntry[]): DuplicatesPreview {
        const { unique, duplicates } = findDuplicates(entries);
        const today = this.tracker().snapshot();
        return {
            playlistId,
            itemCount: entries.length,
            unique: unique.length,
            duplicates,
            quota: estimateRemovalQuota(entries.length, duplicates.length),
            quotaToday: { ...today, deletesPossible: Math.floor(today.remaining / QUOTA_COST.delete) },
        };
    }
}
