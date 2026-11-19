import { QUOTA_COST } from '../services/youtube/youtube.constants';
import type {
    DuplicateEntry,
    DuplicatesPreview,
    PlaylistEntry,
    QuotaSnapshot,
    RemovalJob,
    RemovalQuotaEstimate,
} from '../services/youtube/youtube.types';

const brasilia = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(iso),
    );

export const formatEntry = (entry: PlaylistEntry) => ({
    posicao: entry.position,
    titulo: entry.title,
    canal: entry.channel,
    videoId: entry.videoId,
    playlistItemId: entry.playlistItemId,
});

export const formatDuplicate = (entry: DuplicateEntry) => ({
    ...formatEntry(entry),
    primeiraOcorrencia: entry.firstPosition,
});

export const formatEstimate = (quota: RemovalQuotaEstimate) => ({
    unidadesLeitura: quota.listUnits,
    unidadesRemocao: quota.deleteUnits,
    total: quota.total,
    limiteDiario: quota.dailyLimit,
    cabeEmUmDia: quota.fitsInOneDay,
    maxRemocoesPorDia: quota.maxDeletesPerDay,
    diasNecessarios: quota.daysNeeded,
});

export const formatQuotaSnapshot = (quota: QuotaSnapshot) => ({
    dia: quota.day,
    usado: quota.used,
    limite: quota.limit,
    restante: quota.remaining,
    remocoesPossiveis: Math.floor(quota.remaining / QUOTA_COST.delete),
    zeraEm: quota.resetsAt,
    zeraEmBrasilia: brasilia(quota.resetsAt),
    observacao:
        'Conta só o que este projeto gastou por aqui. Outros usos do mesmo projeto no Google Cloud não aparecem.',
});

export const formatPreview = (preview: DuplicatesPreview) => ({
    playlistId: preview.playlistId,
    totalItens: preview.itemCount,
    ficam: preview.unique,
    duplicados: preview.duplicates.length,
    itensDuplicados: preview.duplicates.map(formatDuplicate),
    quota: formatEstimate(preview.quota),
    quotaHoje: formatQuotaSnapshot(preview.quotaToday),
    cabemHoje: Math.min(preview.duplicates.length, preview.quotaToday.deletesPossible),
});

const isSkip = (reason?: string) => reason?.startsWith('skipped_') ?? false;

const STATUS_TEXT: Record<RemovalJob['status'], string> = {
    running: 'em andamento',
    done: 'concluída',
    partial: 'parcial',
    failed: 'interrompida por erro',
};

export function formatJob(job: RemovalJob, quota: QuotaSnapshot) {
    const errors = job.failed.filter((f) => !isSkip(f.reason));
    const pending = job.total - job.removed.length - errors.length;
    const stopText =
        job.stopReason === 'daily_budget'
            ? `A quota do dia acabou. Rode a remoção de novo depois de ${brasilia(quota.resetsAt)} (horário de Brasília).`
            : job.stopReason === 'quota_exceeded'
              ? `O Google recusou por falta de quota. Rode a remoção de novo depois de ${brasilia(quota.resetsAt)}.`
              : undefined;

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
        quotaHoje: formatQuotaSnapshot(quota),
    };
}
