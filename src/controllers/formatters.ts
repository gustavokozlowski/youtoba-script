import { QUOTA_COST } from '../services/youtube/youtube.constants';
import type {
    DuplicateEntry,
    DuplicatesOverview,
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

type ItemState = 'apagado' | 'falhou' | 'pendente';

/** Estado de cada item para a interface. Pulado por falta de saldo conta como pendente: sai na próxima rodada. */
function itemStates(job: RemovalJob) {
    const removed = new Set(job.removed);
    const failed = new Set(job.failed.filter((f) => !isSkip(f.reason)).map((f) => f.id));
    return job.items.map((entry) => {
        const estado: ItemState = removed.has(entry.playlistItemId)
            ? 'apagado'
            : failed.has(entry.playlistItemId)
              ? 'falhou'
              : 'pendente';
        return { ...formatDuplicate(entry), estado };
    });
}

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
        itens: itemStates(job),
        quotaHoje: formatQuotaSnapshot(quota),
    };
}

const PRIVACY: Record<string, string> = { public: 'pública', private: 'privada', unlisted: 'não listada' };
const COVER_SOURCE = { playlist: 'playlist', first_video: 'primeiro_video', none: 'nenhuma' } as const;

export function formatOverview(overview: DuplicatesOverview) {
    const remaining = overview.quotaToday.remaining;
    return {
        resumo: {
            playlistsAnalisadas: overview.analyzed,
            ignoradasComMenosDe2Itens: overview.skippedSmall,
            comDuplicados: overview.withDuplicates,
            totalDuplicados: overview.totalDuplicates,
            custoTotalRemocao: overview.totalRemovalCost,
            custoDestaAnalise: overview.analysisCost,
            ...(overview.stoppedByQuota
                ? { aviso: 'A quota acabou no meio da análise; a lista está incompleta.' }
                : {}),
            falhas: overview.failed.map((f) => ({ playlistId: f.playlistId, titulo: f.title, motivo: f.reason })),
        },
        quotaHoje: formatQuotaSnapshot(overview.quotaToday),
        playlists: overview.playlists.map((p) => ({
            playlistId: p.playlistId,
            titulo: p.title,
            capa: p.cover ?? null,
            origemCapa: COVER_SOURCE[p.coverSource],
            link: p.link,
            privacidade: p.privacy ? (PRIVACY[p.privacy] ?? p.privacy) : null,
            totalVideos: p.totalVideos,
            aposRemocao: p.afterRemoval,
            duplicados: p.duplicates,
            percentualDuplicado: p.duplicatePercent,
            indisponiveis: p.unavailable,
            maisRepetidos: p.mostRepeated.map((m) => ({ videoId: m.videoId, titulo: m.title, copias: m.copies })),
            custoRemocao: { unidades: p.removalCost, cabeHoje: p.removalCost <= remaining },
            comandos:
                p.duplicates > 0
                    ? {
                          dryRun: `GET /playlist/${p.playlistId}/duplicates`,
                          remover: `DELETE /playlist/${p.playlistId}/remove-duplicates?confirm=${p.duplicates}`,
                      }
                    : null,
        })),
    };
}
