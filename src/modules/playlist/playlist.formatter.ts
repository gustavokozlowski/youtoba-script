import { formatEstimate, formatQuotaSnapshot } from '../quota/quota.formatter';
import type {
    DuplicateEntry,
    DuplicatesOverview,
    DuplicatesPreview,
    PlaylistEntry,
    RemovalPreviewBase,
    UnavailablePreview,
} from './playlist.types';

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

/** Custo estimado, saldo de hoje e quantos itens (de `count`) cabem nele; igual nos dois dry-runs. */
const formatBudget = (preview: RemovalPreviewBase, count: number) => ({
    quota: formatEstimate(preview.quota),
    quotaHoje: formatQuotaSnapshot(preview.quotaToday),
    cabemHoje: Math.min(count, preview.quotaToday.deletesPossible),
});

const UNAVAILABLE_WARNING = 'Vídeos apagados não podem ser adicionados de novo: o backup só registra o que saiu.';

export const formatUnavailablePreview = (preview: UnavailablePreview) => ({
    playlistId: preview.playlistId,
    totalItens: preview.itemCount,
    apagados: preview.deleted.length,
    itensApagados: preview.deleted.map(formatEntry),
    ...formatBudget(preview, preview.deleted.length),
    aviso: UNAVAILABLE_WARNING,
});

export const formatPreview = (preview: DuplicatesPreview) => ({
    playlistId: preview.playlistId,
    totalItens: preview.itemCount,
    ficam: preview.unique,
    duplicados: preview.duplicates.length,
    itensDuplicados: preview.duplicates.map(formatDuplicate),
    ...formatBudget(preview, preview.duplicates.length),
});

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
