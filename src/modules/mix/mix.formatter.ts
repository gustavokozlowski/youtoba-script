import path from 'node:path';
import { itemStateOf, jobProgress, STATUS_TEXT, safeCount, stopFields } from '../jobs/job.formatter';
import { formatDuplicate, formatEntry } from '../playlist/playlist.formatter';
import type { Availability, PlaylistEntry } from '../playlist/playlist.types';
import { formatQuotaSnapshot } from '../quota/quota.formatter';
import type { QuotaSnapshot, WriteQuotaEstimate } from '../quota/quota.types';
import type { MixUndoPreview } from '../removal/removal.types';
import type { MixJob, MixPreview } from './mix.types';

const UNAVAILABLE_TEXT: Record<Availability, string> = { deleted: 'apagado', private: 'privado' };

const formatMixEstimate = (quota: WriteQuotaEstimate) => ({
    unidadesLeitura: quota.listUnits,
    unidadesAdicao: quota.writeUnits,
    total: quota.total,
    limiteDiario: quota.dailyLimit,
    cabeEmUmDia: quota.fitsInOneDay,
    maxAdicoesPorDia: quota.maxWritesPerDay,
    diasNecessarios: quota.daysNeeded,
});

const formatUnavailable = (entry: PlaylistEntry) => ({
    ...formatEntry(entry),
    motivo: entry.unavailable ? UNAVAILABLE_TEXT[entry.unavailable] : undefined,
});

/** Tamanho das duas playlists; vai no dry-run e na resposta de "nada novo". */
export const formatMixSides = (preview: MixPreview) => ({
    origem: { playlistId: preview.sourceId, totalItens: preview.sourceCount },
    destino: { playlistId: preview.targetId, totalItens: preview.targetCount },
});

/** Como confirmar; só há o que confirmar se algo entra. */
const confirmHint = ({ sourceId, targetId, plan }: MixPreview) =>
    plan.toAdd.length === 0
        ? 'Nada novo para adicionar.'
        : `POST /playlist/${targetId}/mix?origem=${sourceId}&confirm=${plan.toAdd.length} (o que entra fica registrado para desfazer)`;

export const formatMixPreview = (preview: MixPreview) => ({
    ...formatMixSides(preview),
    entram: preview.plan.toAdd.map(formatEntry),
    pulados: {
        jaNoDestino: preview.plan.skipped.alreadyInTarget.map(formatEntry),
        repetidosNaOrigem: preview.plan.skipped.repeatedInSource.map(formatDuplicate),
        indisponiveis: preview.plan.skipped.unavailable.map(formatUnavailable),
    },
    quota: formatMixEstimate(preview.quota),
    quotaHoje: formatQuotaSnapshot(preview.quotaToday),
    cabemHoje: preview.fitToday,
    paraAdicionar: confirmHint(preview),
});

/** Estado de cada item para a interface. Pulado por falta de saldo conta como pendente: entra na próxima rodada. */
function itemStates(job: MixJob) {
    const stateOf = itemStateOf(
        'adicionado',
        job.added.map((a) => a.videoId),
        job.failed,
    );
    return job.items.map((entry) => ({ ...formatEntry(entry), estado: stateOf(entry.videoId) }));
}

/** Resumo para a lista de jobs (sem os itens). */
export const formatMixJobSummary = (job: MixJob) => ({
    jobId: job.id,
    playlistId: job.playlistId,
    origem: job.sourceId,
    tipo: 'mix',
    status: job.status,
    situacao: STATUS_TEXT[job.status],
    adicionados: job.added.length,
    total: safeCount(job.total),
    iniciadoEm: job.startedAt,
    terminadoEm: job.finishedAt,
});

export function formatMixJob(job: MixJob, quota: QuotaSnapshot) {
    const { total, errors, pending, percent } = jobProgress(job.total, job.added.length, job.failed);

    return {
        jobId: job.id,
        tipo: 'mix',
        status: job.status,
        situacao: STATUS_TEXT[job.status],
        origem: job.sourceId,
        destino: job.playlistId,
        progresso: `${job.added.length} de ${total} vídeos adicionados`,
        percentual: percent,
        adicionados: job.added.length,
        total,
        falhas: errors,
        pendentes: pending,
        ultimoItem: job.lastItem && {
            posicao: job.lastItem.position,
            titulo: job.lastItem.title,
            resultado: job.lastItem.outcome === 'added' ? 'adicionado' : 'falhou',
        },
        ...stopFields(job.stopReason, 'o Mix', quota),
        ...(job.error ? { erro: job.error } : {}),
        iniciadoEm: job.startedAt,
        terminadoEm: job.finishedAt,
        registro: job.recordFile,
        desfazer: `/mixes/${path.basename(job.recordFile)}/undo`,
        itens: itemStates(job),
        quotaHoje: formatQuotaSnapshot(quota),
    };
}

/** Corpo do 409 do desfazer: o que sairia do destino agora. */
export const formatUndoPreview = (preview: MixUndoPreview) => ({
    destino: { playlistId: preview.playlistId, totalItens: preview.itemCount },
    itens: preview.items.map(formatEntry),
    quotaHoje: formatQuotaSnapshot(preview.quotaToday),
});
