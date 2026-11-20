import type { YoutubeClient } from '../../infra/youtube/youtube.client';
import type { DeleteItemsResult } from '../../infra/youtube/youtube-api.types';

export interface PlaylistEntry {
    playlistItemId: string;
    videoId: string;
    title: string;
    position: number;
    channel?: string;
}

export interface DuplicateEntry extends PlaylistEntry {
    /** Posição da primeira ocorrência do mesmo vídeo, que é a que fica. */
    firstPosition: number;
}

export interface RemovalQuotaEstimate {
    listUnits: number;
    deleteUnits: number;
    total: number;
    dailyLimit: number;
    fitsInOneDay: boolean;
    maxDeletesPerDay: number;
    daysNeeded: number;
}

export interface PlaylistBackup {
    version: 1;
    playlistId: string;
    createdAt: string;
    itemCount: number;
    items: PlaylistEntry[];
    /** Atualizado a cada item removido; `finishedAt` só aparece quando a remoção termina. */
    removal?: DeleteItemsResult & { updatedAt?: string; finishedAt?: string };
}

export interface RestoreResult {
    restored: { videoId: string; position: number; atOriginalPosition: boolean }[];
    skipped: { videoId: string; position: number; reason: 'already_present' }[];
    failed: { videoId: string; position: number; status?: number; reason?: string }[];
}

export type ReadFailure =
    | { status: 'not_connected' }
    | { status: 'not_found' }
    | { status: 'quota_exceeded' }
    | { status: 'fetch_failed' };

export interface DuplicatesPreview {
    playlistId: string;
    itemCount: number;
    unique: number;
    duplicates: DuplicateEntry[];
    quota: RemovalQuotaEstimate;
    /** Saldo real de hoje (depois da leitura) e quantas remoções ainda cabem nele. */
    quotaToday: QuotaSnapshot & { deletesPossible: number };
}

export type RemoveDuplicatesResult =
    | ReadFailure
    | { status: 'already_running'; job: RemovalJob }
    | { status: 'budget_exhausted'; quota: QuotaSnapshot }
    | ({ status: 'no_duplicates' } & DuplicatesPreview)
    | ({ status: 'confirmation_required' } & DuplicatesPreview)
    | ({ status: 'started'; job: RemovalJob; fitToday: number } & DuplicatesPreview);

export type ClientFactory = () => Promise<YoutubeClient | undefined>;

export interface QuotaSnapshot {
    /** Dia da quota, YYYY-MM-DD no horário do Pacífico. */
    day: string;
    used: number;
    limit: number;
    remaining: number;
    /** Quando a quota zera (ISO, UTC). */
    resetsAt: string;
}

export type RemovalJobStatus = 'running' | 'done' | 'partial' | 'failed';

export interface RemovalJob {
    id: string;
    playlistId: string;
    status: RemovalJobStatus;
    /** Por que parou antes de terminar: saldo do dia (parada nossa) ou quotaExceeded do Google. */
    stopReason?: 'daily_budget' | 'quota_exceeded';
    total: number;
    /** Os duplicados que esta remoção vai apagar, na ordem em que são tentados. */
    items: DuplicateEntry[];
    /** Itens já tentados (removidos ou com falha). */
    processed: number;
    removed: string[];
    failed: DeleteItemsResult['failed'];
    lastItem?: { title: string; position: number; outcome: 'removed' | 'failed' };
    startedAt: string;
    finishedAt?: string;
    backupFile: string;
    error?: string;
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
    /** Unidades de quota gastas por esta análise. */
    analysisCost: number;
    failed: { playlistId: string; title: string; reason: string }[];
    stoppedByQuota: boolean;
    quotaToday: QuotaSnapshot;
}

export type DuplicatesOverviewResult =
    | { status: 'not_connected' }
    | { status: 'quota_exceeded' }
    | { status: 'fetch_failed' }
    | { status: 'budget_exhausted'; estimate: number; quota: QuotaSnapshot }
    | ({ status: 'ok' } & DuplicatesOverview);
