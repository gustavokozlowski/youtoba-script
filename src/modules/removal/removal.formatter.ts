import { itemStateOf, jobProgress, STATUS_TEXT, safeCount, stopFields } from '../jobs/job.formatter';
import { formatEntry } from '../playlist/playlist.formatter';
import { formatQuotaSnapshot } from '../quota/quota.formatter';
import type { QuotaSnapshot } from '../quota/quota.types';
import type { RemovalJob, RemovalKind, RemovalTarget } from './removal.types';

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
    const stateOf = itemStateOf('apagado', job.removed, job.failed);
    return job.items.map((entry) => ({ ...formatTarget(entry), estado: stateOf(entry.playlistItemId) }));
}

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
    const { total, errors, pending, percent } = jobProgress(job.total, job.removed.length, job.failed);

    return {
        jobId: job.id,
        playlistId: job.playlistId,
        tipo: KIND_TEXT[job.kind],
        status: job.status,
        situacao: STATUS_TEXT[job.status],
        progresso: `${job.removed.length} de ${total} itens apagados`,
        percentual: percent,
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
        ...stopFields(job.stopReason, 'a remoção', quota),
        ...(job.error ? { erro: job.error } : {}),
        iniciadoEm: job.startedAt,
        terminadoEm: job.finishedAt,
        backup: job.backupFile,
        restaurar: `npm run restore:playlist -- ${job.backupFile}`,
        itens: itemStates(job),
        quotaHoje: formatQuotaSnapshot(quota),
    };
}
