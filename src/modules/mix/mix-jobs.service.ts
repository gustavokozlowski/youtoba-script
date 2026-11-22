import { randomUUID } from 'node:crypto';
import type { AddProgressEvent } from '../../infra/youtube/youtube-api.types';
import { logger } from '../../shared/logger';
import type { JobLog } from '../jobs/job.types';
import { type JobStore, playlistJobs } from '../jobs/job-store';
import type { PlaylistJob } from '../jobs/job-store.types';
import { runJob } from '../jobs/run-job';
import type { MixJob, StartMixParams } from './mix.types';
import { recordMix } from './mix-record';

/**
 * Mixes em segundo plano, com progresso consultável. Ficam em memória: se o servidor cair, o registro
 * em arquivo (atualizado a cada item) guarda o que já entrou no destino.
 */
export class MixJobs {
    constructor(private readonly store: JobStore<PlaylistJob> = playlistJobs) {}

    /** Qualquer job rodando no destino (remoção ou Mix) bloqueia um novo. */
    runningFor(playlistId: string): PlaylistJob | undefined {
        return this.store.runningFor(playlistId);
    }

    /** Resolve quando o job termina. Útil para scripts e testes. */
    settled(id: string): Promise<void> {
        return this.store.settled(id);
    }

    start(params: StartMixParams): MixJob {
        const job: MixJob = {
            id: randomUUID(),
            playlistId: params.targetId,
            sourceId: params.sourceId,
            kind: 'mix',
            status: 'running',
            total: params.items.length,
            items: params.items,
            processed: 0,
            added: [],
            failed: [],
            startedAt: new Date().toISOString(),
            recordFile: params.recordFile,
        };
        this.store.track(job, this.run(job, params));
        return job;
    }

    private run(job: MixJob, { client, tracker }: StartMixParams) {
        const log = logger.child({ mix: job.id.slice(0, 8) });

        return runJob(job, {
            log,
            messages: { start: 'Mix começou', end: 'Mix terminou' },
            startFields: { itens: job.total, saldoQuota: tracker.remaining() },
            endFields: () => ({ adicionados: job.added.length, total: job.total, parada: job.stopReason }),
            record: (finished) => recordMix(job.recordFile, job, { finished }),
            execute: async (saveProgress) => {
                const result = await client.addVideosToPlaylist(
                    job.playlistId,
                    job.items.map((entry) => entry.videoId),
                    {
                        canSpend: (units) => tracker.canSpend(units),
                        onProgress: (event) => {
                            this.onProgress(job, event);
                            saveProgress();
                            this.logItem(job, event, log);
                        },
                    },
                );
                job.added = result.added;
                job.failed = result.failed;
                return result.failed;
            },
        });
    }

    /** Atualiza o job com o resultado do item. */
    private onProgress(job: MixJob, event: AddProgressEvent) {
        const entry = job.items[event.index];
        job.processed = event.index + 1;
        job.lastItem = {
            title: entry?.title ?? event.itemId,
            position: entry?.position ?? -1,
            outcome: event.outcome === 'succeeded' ? 'added' : 'failed',
        };
        if (event.outcome === 'succeeded' && event.playlistItemId) {
            job.added.push({ videoId: event.itemId, playlistItemId: event.playlistItemId });
        } else if (event.outcome === 'failed') {
            job.failed.push({ id: event.itemId, status: event.status, reason: event.reason });
        }
    }

    /** O log leva só ids e contagens, nunca o título. */
    private logItem(job: MixJob, event: AddProgressEvent, log: JobLog) {
        const falha = event.outcome === 'failed' ? (event.reason ?? event.status) : undefined;
        log.info({ item: event.itemId, adicionados: job.added.length, total: job.total, falha }, 'Item');
    }
}

export const mixJobs = new MixJobs();
