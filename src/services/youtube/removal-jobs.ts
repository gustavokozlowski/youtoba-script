import { randomUUID } from 'node:crypto';
import type { YoutubeClient } from '../../infra/youtube/youtube.client';
import { errorMessage } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { recordRemoval } from './backup';
import type { QuotaTracker } from './quota-tracker';
import type { DuplicateEntry, RemovalJob } from './youtube.types';

/**
 * Remoções em segundo plano, com progresso consultável. Fica em memória: se o servidor cair,
 * o registro do que já foi removido continua no arquivo de backup (atualizado a cada item).
 */
export class RemovalJobs {
    private readonly jobs = new Map<string, RemovalJob>();
    private readonly running = new Map<string, Promise<void>>();

    get(id: string): RemovalJob | undefined {
        return this.jobs.get(id);
    }

    /** Todas as remoções desde que o servidor subiu, a mais recente primeiro. */
    list(): RemovalJob[] {
        return [...this.jobs.values()].reverse();
    }

    runningFor(playlistId: string): RemovalJob | undefined {
        return [...this.jobs.values()].find((job) => job.playlistId === playlistId && job.status === 'running');
    }

    /** Resolve quando o job termina. Útil para scripts e testes. */
    settled(id: string): Promise<void> {
        return this.running.get(id) ?? Promise.resolve();
    }

    start(params: {
        playlistId: string;
        duplicates: DuplicateEntry[];
        backupFile: string;
        client: YoutubeClient;
        tracker: QuotaTracker;
    }): RemovalJob {
        const job: RemovalJob = {
            id: randomUUID(),
            playlistId: params.playlistId,
            status: 'running',
            total: params.duplicates.length,
            items: params.duplicates,
            processed: 0,
            removed: [],
            failed: [],
            startedAt: new Date().toISOString(),
            backupFile: params.backupFile,
        };
        this.jobs.set(job.id, job);
        this.running.set(job.id, this.run(job, params));
        return job;
    }

    private async run(
        job: RemovalJob,
        { duplicates, client, tracker }: { duplicates: DuplicateEntry[]; client: YoutubeClient; tracker: QuotaTracker },
    ) {
        const byId = new Map(duplicates.map((entry) => [entry.playlistItemId, entry]));
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
