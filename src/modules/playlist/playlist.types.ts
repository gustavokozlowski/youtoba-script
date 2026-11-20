import type { PlaylistItem } from '../../infra/youtube/youtube-api.types';
import type { QuotaSnapshot, RemovalQuotaEstimate } from '../quota/quota.types';

/** Por que o item não toca: o vídeo foi apagado ou ficou privado. */
export type Availability = 'deleted' | 'private';

export interface PlaylistEntry {
    playlistItemId: string;
    videoId: string;
    title: string;
    position: number;
    channel?: string;
    /** Só aparece quando o vídeo foi apagado ou é privado. */
    unavailable?: Availability;
}

export interface DuplicateEntry extends PlaylistEntry {
    /** Posição da primeira ocorrência do mesmo vídeo, que é a que fica. */
    firstPosition: number;
}

export type ReadFailure =
    | { status: 'not_connected' }
    | { status: 'not_found' }
    | { status: 'quota_exceeded' }
    | { status: 'fetch_failed' };

/** Saldo real de hoje (depois da leitura) e quantas remoções ainda cabem nele. */
export type QuotaToday = QuotaSnapshot & { deletesPossible: number };

/** O que todo dry-run de remoção traz: tamanho da playlist, custo estimado e saldo de hoje. */
export interface RemovalPreviewBase {
    playlistId: string;
    itemCount: number;
    quota: RemovalQuotaEstimate;
    quotaToday: QuotaToday;
}

export interface DuplicatesPreview extends RemovalPreviewBase {
    unique: number;
    duplicates: DuplicateEntry[];
}

export interface UnavailablePreview extends RemovalPreviewBase {
    /** Só os vídeos apagados; os privados são contados no resumo, mas nunca removidos. */
    deleted: PlaylistEntry[];
}

export interface PlaylistDuplicateSummary {
    playlistId: string;
    title: string;
    link: string;
    /** Capa da playlist ou, se ela não tiver, a do primeiro vídeo com imagem. */
    cover?: string;
    coverSource: 'playlist' | 'first_video' | 'none';
    privacy?: string;
    totalVideos: number;
    afterRemoval: number;
    duplicates: number;
    duplicatePercent: number;
    /** Itens "Deleted video" ou "Private video". */
    unavailable: number;
    /** Vídeos apagados que dá para remover (sem contar cópias posteriores, que entram nos duplicados). */
    deleted: number;
    mostRepeated: { videoId: string; title: string; copies: number }[];
    /** Unidades de quota para remover os duplicados desta playlist. */
    removalCost: number;
}

export interface DuplicatesOverview {
    playlists: PlaylistDuplicateSummary[];
    analyzed: number;
    /** Playlists com menos de 2 itens: não podem ter duplicados e nem são lidas. */
    skippedSmall: number;
    withDuplicates: number;
    totalDuplicates: number;
    totalRemovalCost: number;
    withDeleted: number;
    totalDeleted: number;
    /** Unidades de quota gastas por esta análise. */
    analysisCost: number;
    failed: PlaylistReadFailure[];
    stoppedByQuota: boolean;
    quotaToday: QuotaSnapshot;
}

export type DuplicatesOverviewResult =
    | { status: 'not_connected' }
    | { status: 'quota_exceeded' }
    | { status: 'fetch_failed' }
    | { status: 'budget_exhausted'; estimate: number; quota: QuotaSnapshot }
    | ({ status: 'ok' } & DuplicatesOverview);

/** O que a análise de cada playlist produziu, antes dos totais. */
export interface OverviewAnalysis {
    summaries: PlaylistDuplicateSummary[];
    failed: DuplicatesOverview['failed'];
    /** A quota acabou no meio: a lista está incompleta. */
    stoppedByQuota: boolean;
}

/** Playlist que não pôde ser lida na análise geral. */
export interface PlaylistReadFailure {
    playlistId: string;
    title: string;
    reason: string;
}

/** Resultado da leitura de uma playlist na análise geral. */
export type PlaylistReadResult =
    | { ok: true; summary: PlaylistDuplicateSummary }
    | { ok: false; failure: PlaylistReadFailure };

/** O que a análise precisa do cliente do YouTube (permite testar sem rede). */
export interface PlaylistItemLister {
    listPlaylistItems(playlistId: string): Promise<PlaylistItem[]>;
}
