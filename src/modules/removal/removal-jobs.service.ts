import { randomUUID } from 'node:crypto';
import { errorMessage } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { type JobStore, playlistJobs } from '../jobs/job-store';
import type { PlaylistJob } from '../jobs/job-store.types';
import { recordRemoval } from './backup';
import type { RemovalJob, StartRemovalParams } from './removal.types';

/**
 * Remoções em segundo plano, com progresso consultável. Fica em memória: se o servidor cair,
 * o registro do que já foi removido continua no arquivo de backup (atualizado a cada item).
 */
export class RemovalJobs {
    constructor(private readonly store: JobStore<PlaylistJob> = playlistJobs) {}

    get(id: string): RemovalJob | undefined {
        return this.store.get(id);
    }

    /** Todas as remoções desde que o servidor subiu, a mais recente primeiro. */
    list(): RemovalJob[] {
        return this.store.list();
    }

    runningFor(playlistId: string): RemovalJob | undefined {
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

    private async run(job: RemovalJob, { targets, client, tracker }: StartRemovalParams) {
        const byId = new Map(targets.map((entry) => [entry.playlistItemId, entry]));
        const log = logger.child({ remocao: job.id.slice(0, 8) });
        log.info({ itens: job.total, saldoQuota: tracker.remaining() }, 'Remoção começou');

        try {
            const result = await client.deleteItemsById([...byId.keys()], {
                canSpend: (units) => tracker.canSpend(units),
                onProgress: (event) => {
                    const entry = byId.get(event.itemId);
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
                    recordRemoval(job.backupFile, { removed: job.removed, failed: job.failed }, { finished: false });
                    // Sem o título do vídeo: o log leva só o id do item (o título aparece na interface).
                    const falha = event.outcome === 'removed' ? undefined : (event.reason ?? event.status);
                    log.info({ item: event.itemId, apagados: job.removed.length, total: job.total, falha }, 'Item');
                },
            });

            job.removed = result.removed;
            job.failed = result.failed;
            const reasons = new Set(result.failed.map((f) => f.reason));
            if (reasons.has('skipped_daily_budget')) job.stopReason = 'daily_budget';
            else if (reasons.has('quotaExceeded')) job.stopReason = 'quota_exceeded';
            job.status = result.failed.length === 0 ? 'done' : 'partial';
        } catch (error) {
            job.status = 'failed';
            job.error = errorMessage(error);
        } finally {
            job.finishedAt = new Date().toISOString();
            recordRemoval(job.backupFile, { removed: job.removed, failed: job.failed }, { finished: true });
            log.info({ apagados: job.removed.length, total: job.total, parada: job.stopReason }, 'Remoção terminou');
        }
    }
}

export const removalJobs = new RemovalJobs();
