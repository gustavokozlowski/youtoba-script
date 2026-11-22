import { QUOTA_COST } from '../../infra/youtube/youtube.constants';
import { toEntries } from '../playlist/duplicates';
import { PlaylistService } from '../playlist/playlist.service';
import type { PlaylistEntry, RemovalPreviewBase } from '../playlist/playlist.types';
import { readFailure } from '../playlist/read-failure';
import { type QuotaTracker, quotaTracker } from '../quota/quota-tracker.service';
import { connectedClient } from '../quota/tracked-client';
import type { ClientFactory } from '../quota/tracked-client.types';
import { writeBackup } from './backup';
import type {
    RemovalPlan,
    RemovalResult,
    RemoveDuplicatesResult,
    RemoveUnavailableResult,
    UndoMixResult,
} from './removal.types';
import { type RemovalJobs, removalJobs } from './removal-jobs.service';

/** Começa remoções (de duplicados ou de vídeos apagados) e consulta as que estão em andamento. */
export class RemovalService {
    private readonly playlists: PlaylistService;

    constructor(
        private readonly createClient: ClientFactory = connectedClient,
        private readonly tracker: () => QuotaTracker = quotaTracker,
        private readonly jobs: RemovalJobs = removalJobs,
    ) {
        this.playlists = new PlaylistService(createClient, tracker);
    }

    /** Remove os duplicados (fica a primeira ocorrência). Ver `run` para as regras de confirmação e saldo. */
    removeDuplicates(playlistId: string, confirm: number | undefined): Promise<RemoveDuplicatesResult> {
        return this.run(playlistId, confirm, (entries) => {
            const preview = this.playlists.preview(playlistId, entries);
            return { kind: 'duplicates', preview, targets: preview.duplicates };
        });
    }

    /** Remove os vídeos apagados. Os privados nunca entram. */
    removeUnavailable(playlistId: string, confirm: number | undefined): Promise<RemoveUnavailableResult> {
        return this.run(playlistId, confirm, (entries) => {
            const preview = this.playlists.unavailablePreview(playlistId, entries);
            return { kind: 'unavailable', preview, targets: preview.deleted };
        });
    }

    /** Desfaz um Mix: remove do destino só os itens cujo `playlistItemId` está em `itemIds` (os que o Mix adicionou). */
    undoMix(playlistId: string, itemIds: ReadonlySet<string>, confirm: number | undefined): Promise<UndoMixResult> {
        return this.run(playlistId, confirm, (entries) => {
            const items = entries.filter((entry) => itemIds.has(entry.playlistItemId));
            const preview = { ...this.playlists.removalPreview(playlistId, entries, items), items };
            return { kind: 'mix_undo', preview, targets: items };
        });
    }

    /**
     * Inicia a remoção em segundo plano. Só começa se `confirm` for igual ao número de alvos encontrados
     * agora e se houver saldo de quota para ao menos um item. Antes de apagar, grava o backup da playlist inteira.
     */
    private async run<P extends RemovalPreviewBase>(
        playlistId: string,
        confirm: number | undefined,
        plan: (entries: PlaylistEntry[]) => RemovalPlan<P>,
    ): Promise<RemovalResult<P>> {
        const running = this.alreadyRunning(playlistId);
        if (running) return running;

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

        const { kind, preview, targets } = plan(entries);
        if (targets.length === 0) return { status: 'nothing_to_remove', ...preview };
        if (confirm !== targets.length) return { status: 'confirmation_required', ...preview };
        if (preview.quotaToday.deletesPossible === 0) return { status: 'budget_exhausted', quota: tracker.snapshot() };

        // Outra remoção pode ter começado enquanto esta lia a playlist; daqui até o start não há await.
        const raced = this.alreadyRunning(playlistId);
        if (raced) return raced;

        const backupFile = writeBackup(playlistId, entries);
        const job = this.jobs.start({ playlistId, kind, targets, backupFile, client, tracker });
        const fitToday = Math.min(targets.length, preview.quotaToday.deletesPossible);
        return { status: 'started', job, fitToday, ...preview };
    }

    private alreadyRunning(playlistId: string) {
        const job = this.jobs.runningFor(playlistId);
        return job ? ({ status: 'already_running', job } as const) : undefined;
    }
}
