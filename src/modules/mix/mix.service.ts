import { QUOTA_COST } from '../../infra/youtube/youtube.constants';
import { toEntries } from '../playlist/duplicates';
import { readFailure } from '../playlist/read-failure';
import { type QuotaTracker, quotaTracker } from '../quota/quota-tracker.service';
import { connectedClient } from '../quota/tracked-client';
import type { ClientFactory } from '../quota/tracked-client.types';
import type { MixIds, MixPreviewResult, MixReadResult, MixStartResult } from './mix.types';
import { type MixJobs, mixJobs } from './mix-jobs.service';
import { buildMixPreview, startBlocker } from './mix-preview';
import { writeMixRecord } from './mix-record';

/** Dry-run e início do Mix: copia os vídeos da origem para o fim do destino, sem repetir e sem tocar na origem. */
export class MixService {
    constructor(
        private readonly createClient: ClientFactory = connectedClient,
        private readonly tracker: () => QuotaTracker = quotaTracker,
        private readonly jobs: MixJobs = mixJobs,
    ) {}

    /** Lê as duas playlists e mostra o que entraria e quanto custa. Não escreve nada. */
    async preview(ids: MixIds): Promise<MixPreviewResult> {
        const read = await this.read(ids);
        if (read.status !== 'ok') return read;
        const preview = buildMixPreview(ids, read.source, read.target, this.tracker().snapshot());
        return { status: 'ok', ...preview };
    }

    /**
     * Inicia o Mix em segundo plano. Só começa se `confirm` for igual ao número de vídeos que entram agora
     * (numa leitura nova) e se o saldo cobrir ao menos um insert. Grava o registro antes do primeiro insert.
     */
    async start(ids: MixIds, confirm: number | undefined): Promise<MixStartResult> {
        const running = this.alreadyRunning(ids.targetId);
        if (running) return running;

        const tracker = this.tracker();
        if (!tracker.canSpend(QUOTA_COST.list * 2)) return { status: 'budget_exhausted', quota: tracker.snapshot() };

        const read = await this.read(ids);
        if (read.status !== 'ok') return read;

        const preview = buildMixPreview(ids, read.source, read.target, tracker.snapshot());
        const blocked = startBlocker(preview, confirm);
        if (blocked) return blocked;

        // Outro job pode ter começado enquanto este lia as playlists; daqui até o start não há await.
        const raced = this.alreadyRunning(ids.targetId);
        if (raced) return raced;

        const items = preview.plan.toAdd;
        const recordFile = writeMixRecord(ids.sourceId, ids.targetId, items);
        const job = this.jobs.start({ ...ids, items, recordFile, client: read.client, tracker });
        return { status: 'started', job, ...preview };
    }

    /** Lê origem e destino em paralelo, com o mesmo client (um token só). */
    private async read({ sourceId, targetId }: MixIds): Promise<MixReadResult> {
        const client = await this.createClient();
        if (!client) return { status: 'not_connected' };
        try {
            const [source, target] = await Promise.all([
                client.listPlaylistItems(sourceId),
                client.listPlaylistItems(targetId),
            ]);
            return { status: 'ok', client, source: toEntries(source), target: toEntries(target) };
        } catch (error) {
            return readFailure(error);
        }
    }

    private alreadyRunning(targetId: string) {
        const job = this.jobs.runningFor(targetId);
        return job ? ({ status: 'already_running', job } as const) : undefined;
    }
}
