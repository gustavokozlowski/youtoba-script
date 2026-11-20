import { formatDuplicate } from '../playlist/playlist.formatter';
import { brasiliaDateTime, formatQuotaSnapshot } from '../quota/quota.formatter';
import type { QuotaSnapshot } from '../quota/quota.types';
import type { JobItemState, RemovalJob } from './removal.types';

const isSkip = (reason?: string) => reason?.startsWith('skipped_') ?? false;

const STATUS_TEXT: Record<RemovalJob['status'], string> = {
    running: 'em andamento',
    done: 'concluída',
    partial: 'parcial',
    failed: 'interrompida por erro',
};

/** Estado de cada item para a interface. Pulado por falta de saldo conta como pendente: sai na próxima rodada. */
function itemStates(job: RemovalJob) {
    const removed = new Set(job.removed);
    const failed = new Set(job.failed.filter((f) => !isSkip(f.reason)).map((f) => f.id));
    const stateOf = (id: string): JobItemState => {
        if (removed.has(id)) return 'apagado';
        if (failed.has(id)) return 'falhou';
        return 'pendente';
    };
    return job.items.map((entry) => ({ ...formatDuplicate(entry), estado: stateOf(entry.playlistItemId) }));
}

/** O que fazer depois de uma parada por cota, com a hora em que ela zera. */
const STOP_TEXT: Record<NonNullable<RemovalJob['stopReason']>, (resetsAt: string) => string> = {
    daily_budget: (resetsAt) =>
        `A quota do dia acabou. Rode a remoção de novo depois de ${resetsAt} (horário de Brasília).`,
    quota_exceeded: (resetsAt) => `O Google recusou por falta de quota. Rode a remoção de novo depois de ${resetsAt}.`,
};

/** Resumo para a lista de remoções (sem os itens). */
export const formatJobSummary = (job: RemovalJob) => ({
    jobId: job.id,
    playlistId: job.playlistId,
    status: job.status,
    situacao: STATUS_TEXT[job.status],
    removidos: job.removed.length,
    total: job.total,
    iniciadoEm: job.startedAt,
    terminadoEm: job.finishedAt,
});

export function formatJob(job: RemovalJob, quota: QuotaSnapshot) {
    const errors = job.failed.filter((f) => !isSkip(f.reason));
    const pending = job.total - job.removed.length - errors.length;
    const stopText = job.stopReason && STOP_TEXT[job.stopReason](brasiliaDateTime(quota.resetsAt));

    return {
        jobId: job.id,
        playlistId: job.playlistId,
        status: job.status,
        situacao: STATUS_TEXT[job.status],
        progresso: `${job.removed.length} de ${job.total} itens apagados`,
        percentual: job.total === 0 ? 100 : Math.round((job.removed.length / job.total) * 100),
        removidos: job.removed.length,
        falhas: errors,
        pendentes: pending,
        ultimoItem: job.lastItem && {
            posicao: job.lastItem.position,
            titulo: job.lastItem.title,
            resultado: job.lastItem.outcome === 'removed' ? 'apagado' : 'falhou',
        },
        ...(stopText ? { motivoParada: job.stopReason, proximoPasso: stopText } : {}),
        ...(job.error ? { erro: job.error } : {}),
        iniciadoEm: job.startedAt,
        terminadoEm: job.finishedAt,
        backup: job.backupFile,
        restaurar: `npm run restore:playlist -- ${job.backupFile}`,
        itens: itemStates(job),
        quotaHoje: formatQuotaSnapshot(quota),
    };
}
