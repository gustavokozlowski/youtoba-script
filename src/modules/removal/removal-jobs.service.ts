import { randomUUID } from 'node:crypto';
import type { DeleteProgressEvent } from '../../infra/youtube/youtube-api.types';
import { logger } from '../../shared/logger';
import { type JobStore, playlistJobs } from '../jobs/job-store';
import type { PlaylistJob } from '../jobs/job-store.types';
import { runJob } from '../jobs/run-job';
import { recordRemoval } from './backup';
import type { RemovalJob, RemovalTarget, StartRemovalParams } from './removal.types';

/**
 * Remoções em segundo plano, com progresso consultável. Fica em memória: se o servidor cair,
 * o registro do que já foi removido continua no arquivo de backup (atualizado a cada item).
 */
export class RemovalJobs {
    constructor(private readonly store: JobStore<PlaylistJob> = playlistJobs) {}

    runningFor(playlistId: string): PlaylistJob | undefined {
        return this.store.runningFor(playlistId);
    }

    /** Resolve quando o job termina. Útil para scripts e testes. */
    settled(id: string): Promise<void> {
        return this.store.settled(id);
    }

    start(params: StartRemovalParams): RemovalJob {
        const job: RemovalJob = {
            id: randomUUID(),
            playlistId: params.playlistId,
            kind: params.kind,
            status: 'running',
            total: params.targets.length,
            items: params.targets,
            processed: 0,
            removed: [],
            failed: [],
            startedAt: new Date().toISOString(),
            backupFile: params.backupFile,
        };
        this.store.track(job, this.run(job, params));
        return job;
    }

    private run(job: RemovalJob, { targets, client, tracker }: StartRemovalParams) {
        const byId = new Map(targets.map((entry) => [entry.playlistItemId, entry]));
        const log = logger.child({ remocao: job.id.slice(0, 8) });
        const record = (finished: boolean) =>
            recordRemoval(job.backupFile, { removed: job.removed, failed: job.failed }, { finished });

        return runJob(job, {
            log,
            messages: { start: 'Remoção começou', end: 'Remoção terminou' },
            startFields: { itens: job.total, saldoQuota: tracker.remaining() },
            endFields: () => ({ apagados: job.removed.length, total: job.total, parada: job.stopReason }),
            record,
            execute: async (saveProgress) => {
                const result = await client.deleteItemsById([...byId.keys()], {
                    canSpend: (units) => tracker.canSpend(units),
                    onProgress: (event) => {
                        this.onProgress(job, byId.get(event.itemId), event);
                        saveProgress();
                        // Sem o título do vídeo: o log leva só o id do item (o título aparece na interface).
                        const falha = event.outcome === 'removed' ? undefined : (event.reason ?? event.status);
                        log.info({ item: event.itemId, apagados: job.removed.length, total: job.total, falha }, 'Item');
                    },
                });
                job.removed = result.removed;
                job.failed = result.failed;
                return result.failed;
            },
        });
    }

    private onProgress(job: RemovalJob, entry: RemovalTarget | undefined, event: DeleteProgressEvent) {
        job.processed = event.index + 1;
        job.lastItem = {
            title: entry?.title ?? event.itemId,
            position: entry?.position ?? -1,
            outcome: event.outcome,
        };
        if (event.outcome === 'removed') {
            job.removed.push(event.itemId);
        } else {
            job.failed.push({ id: event.itemId, status: event.status, reason: event.reason });
        }
    }
}

export const removalJobs = new RemovalJobs();
