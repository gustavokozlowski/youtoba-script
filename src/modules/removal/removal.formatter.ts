import { formatEntry } from '../playlist/playlist.formatter';
import { brasiliaDateTime, formatQuotaSnapshot } from '../quota/quota.formatter';
import type { QuotaSnapshot } from '../quota/quota.types';
import type { JobItemState, RemovalJob, RemovalKind, RemovalTarget } from './removal.types';

const isSkip = (reason?: string) => reason?.startsWith('skipped_') ?? false;
const safeCount = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

const STATUS_TEXT: Record<RemovalJob['status'], string> = {
    running: 'em andamento',
    done: 'concluída',
    partial: 'parcial',
    failed: 'interrompida por erro',
};

const KIND_TEXT: Record<RemovalKind, 'duplicados' | 'apagados'> = {
    duplicates: 'duplicados',
    unavailable: 'apagados',
};

/** O item na resposta; `primeiraOcorrencia` só aparece nos duplicados. */
const formatTarget = (target: RemovalTarget) => ({
    ...formatEntry(target),
    ...(target.firstPosition === undefined ? {} : { primeiraOcorrencia: target.firstPosition }),
});

/** Estado de cada item para a interface. Pulado por falta de saldo conta como pendente: sai na próxima rodada. */
function itemStates(job: RemovalJob) {
    const removed = new Set(job.removed);
    const failed = new Set(job.failed.filter((f) => !isSkip(f.reason)).map((f) => f.id));
    const stateOf = (id: string): JobItemState => {
        if (removed.has(id)) return 'apagado';
        if (failed.has(id)) return 'falhou';
        return 'pendente';
    };
    return job.items.map((entry) => ({ ...formatTarget(entry), estado: stateOf(entry.playlistItemId) }));
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
    tipo: KIND_TEXT[job.kind],
    status: job.status,
    situacao: STATUS_TEXT[job.status],
    removidos: job.removed.length,
    total: safeCount(job.total),
    iniciadoEm: job.startedAt,
    terminadoEm: job.finishedAt,
});

export function formatJob(job: RemovalJob, quota: QuotaSnapshot) {
    const errors = job.failed.filter((f) => !isSkip(f.reason));
    const total = safeCount(job.total);
    const pending = Math.max(0, total - job.removed.length - errors.length);
    const stopText = job.stopReason && STOP_TEXT[job.stopReason](brasiliaDateTime(quota.resetsAt));

    return {
        jobId: job.id,
        playlistId: job.playlistId,
        tipo: KIND_TEXT[job.kind],
        status: job.status,
        situacao: STATUS_TEXT[job.status],
        progresso: `${job.removed.length} de ${total} itens apagados`,
        percentual: total === 0 ? 100 : Math.round((job.removed.length / total) * 100),
        removidos: job.removed.length,
        // A tela mostra "removidos de total" a cada consulta: o total vem aqui, não só na resposta 202.
        total,
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
