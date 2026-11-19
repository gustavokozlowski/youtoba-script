import type { DeleteItemsResult } from './client/client.types';
import type { YoutubeClient } from './client/youtube.client';

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
    removal?: DeleteItemsResult & { finishedAt: string };
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
}

export type RemoveDuplicatesResult =
    | ReadFailure
    | ({ status: 'no_duplicates' } & DuplicatesPreview)
    | ({ status: 'confirmation_required' } & DuplicatesPreview)
    | ({ status: 'done'; backupFile: string } & DuplicatesPreview & DeleteItemsResult);

export type ClientFactory = () => Promise<YoutubeClient | undefined>;
