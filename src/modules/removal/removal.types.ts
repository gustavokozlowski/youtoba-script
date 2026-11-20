import type { YoutubeClient } from '../../infra/youtube/youtube.client';
import type { DeleteItemsResult } from '../../infra/youtube/youtube-api.types';
import type {
    DuplicatesPreview,
    PlaylistEntry,
    ReadFailure,
    RemovalPreviewBase,
    UnavailablePreview,
} from '../playlist/playlist.types';
import type { QuotaSnapshot } from '../quota/quota.types';
import type { QuotaTracker } from '../quota/quota-tracker.service';

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

/** O que se remove: duplicados ou vídeos apagados. */
export type RemovalKind = 'duplicates' | 'unavailable';

/** Item a remover; `firstPosition` só existe nos duplicados (posição da ocorrência que fica). */
export type RemovalTarget = PlaylistEntry & { firstPosition?: number };

/** Resultado de uma tentativa de remoção que não falhou na leitura, com o dry-run `P` do tipo de remoção. */
export type RemovalStatusResult<P extends RemovalPreviewBase> =
    | { status: 'already_running'; job: RemovalJob }
    | { status: 'budget_exhausted'; quota: QuotaSnapshot }
    | ({ status: 'nothing_to_remove' } & P)
    | ({ status: 'confirmation_required' } & P)
    | RemovalStarted<P>;

export type RemovalStarted<P extends RemovalPreviewBase> = { status: 'started'; job: RemovalJob; fitToday: number } & P;

export type RemovalResult<P extends RemovalPreviewBase> = ReadFailure | RemovalStatusResult<P>;

export type RemoveDuplicatesResult = RemovalResult<DuplicatesPreview>;
export type RemoveUnavailableResult = RemovalResult<UnavailablePreview>;

/** O que muda de um tipo de remoção para outro: como ler os alvos de uma playlist já lida. */
export interface RemovalPlan<P extends RemovalPreviewBase> {
    kind: RemovalKind;
    preview: P;
    targets: RemovalTarget[];
}

/** Dados para começar uma remoção em segundo plano. */
export interface StartRemovalParams {
    playlistId: string;
    kind: RemovalKind;
    targets: RemovalTarget[];
    backupFile: string;
    client: YoutubeClient;
    tracker: QuotaTracker;
}

export type RemovalJobStatus = 'running' | 'done' | 'partial' | 'failed';

export interface RemovalJob {
    id: string;
    playlistId: string;
    kind: RemovalKind;
    status: RemovalJobStatus;
    /** Por que parou antes de terminar: saldo do dia (parada nossa) ou quotaExceeded do Google. */
    stopReason?: 'daily_budget' | 'quota_exceeded';
    total: number;
    /** Os itens que esta remoção vai apagar, na ordem em que são tentados. */
    items: RemovalTarget[];
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

/** Estado de cada item de uma remoção, como a interface mostra. */
export type JobItemState = 'apagado' | 'falhou' | 'pendente';

/** O que muda na resposta HTTP de cada tipo de remoção. */
export interface RemovalReplySpec<P extends RemovalPreviewBase> {
    emptyMessage: string;
    confirmationMessage: (count: number) => string;
    count: (preview: P) => number;
    formatPreview: (preview: P) => Record<string, unknown>;
}

/** Status HTTP e corpo JSON da resposta. */
export type RemovalReply = [number, Record<string, unknown>];
