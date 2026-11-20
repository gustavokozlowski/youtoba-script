import { QUOTA_COST } from '../../infra/youtube/youtube.constants';
import { toEntries } from '../playlist/duplicates';
import { PlaylistService } from '../playlist/playlist.service';
import type { PlaylistEntry } from '../playlist/playlist.types';
import { readFailure } from '../playlist/read-failure';
import { type QuotaTracker, quotaTracker } from '../quota/quota-tracker.service';
import { connectedClient } from '../quota/tracked-client';
import type { ClientFactory } from '../quota/tracked-client.types';
import { writeBackup } from './backup';
import type { RemovalJob, RemoveDuplicatesResult } from './removal.types';
import { type RemovalJobs, removalJobs } from './removal-jobs.service';

/** Começa remoções de duplicados e consulta as que estão em andamento. */
export class RemovalService {
    private readonly playlists: PlaylistService;

    constructor(
        private readonly createClient: ClientFactory = connectedClient,
        private readonly tracker: () => QuotaTracker = quotaTracker,
        private readonly jobs: RemovalJobs = removalJobs,
    ) {
        this.playlists = new PlaylistService(createClient, tracker);
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

        const preview = this.playlists.preview(playlistId, entries);
        if (preview.duplicates.length === 0) return { status: 'no_duplicates', ...preview };
        if (confirm !== preview.duplicates.length) return { status: 'confirmation_required', ...preview };
        if (preview.quotaToday.deletesPossible === 0) return { status: 'budget_exhausted', quota: tracker.snapshot() };

        const backupFile = writeBackup(playlistId, entries);
        const job = this.jobs.start({ playlistId, duplicates: preview.duplicates, backupFile, client, tracker });
        const fitToday = Math.min(preview.duplicates.length, preview.quotaToday.deletesPossible);
        return { status: 'started', job, fitToday, ...preview };
    }

    job(jobId: string): RemovalJob | undefined {
        return this.jobs.get(jobId);
    }

    allJobs(): RemovalJob[] {
        return this.jobs.list();
    }
}
