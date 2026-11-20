import type { DeleteItemsResult } from '../../infra/youtube/youtube-api.types';
import type { DuplicateEntry, DuplicatesPreview, PlaylistEntry, ReadFailure } from '../playlist/playlist.types';
import type { QuotaSnapshot } from '../quota/quota.types';

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

export type RemoveDuplicatesResult =
    | ReadFailure
    | { status: 'already_running'; job: RemovalJob }
    | { status: 'budget_exhausted'; quota: QuotaSnapshot }
    | ({ status: 'no_duplicates' } & DuplicatesPreview)
    | ({ status: 'confirmation_required' } & DuplicatesPreview)
    | ({ status: 'started'; job: RemovalJob; fitToday: number } & DuplicatesPreview);

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

/** Estado de cada item de uma remoção, como a interface mostra. */
export type JobItemState = 'apagado' | 'falhou' | 'pendente';

/** Os resultados da remoção que não são falha de leitura da playlist. */
export type RemovalStatusResult = Exclude<RemoveDuplicatesResult, ReadFailure>;

export type RemovalStarted = Extract<RemoveDuplicatesResult, { status: 'started' }>;

/** Status HTTP e corpo JSON da resposta. */
export type RemovalReply = [number, Record<string, unknown>];
