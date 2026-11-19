import { googleAuth } from '../google';
import { recordRemoval, writeBackup } from './backup';
import type { PlaylistsResponse } from './client/client.types';
import { apiFailure, type DeleteItemsResult, YoutubeClient } from './client/youtube.client';
import { type DuplicateEntry, findDuplicates, type PlaylistEntry, toEntries } from './duplicates';
import { estimateRemovalQuota, type RemovalQuotaEstimate } from './quota';

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

type ClientFactory = () => Promise<YoutubeClient | undefined>;

// Um client por chamada: o service não guarda token nem client entre requisições.
const defaultClientFactory: ClientFactory = async () => {
    const apiKey = process.env.API_KEY;
    const token = await googleAuth().getAccessToken();
    return token && apiKey ? new YoutubeClient({ apiKey, token }) : undefined;
};

function readFailure(error: unknown): ReadFailure {
    const { status, reason } = apiFailure(error);
    if (status === 404 || reason === 'playlistNotFound') return { status: 'not_found' };
    if (reason === 'quotaExceeded') return { status: 'quota_exceeded' };
    console.error(`Falha ao ler a playlist: HTTP ${status ?? '?'} ${reason ?? ''}`);
    return { status: 'fetch_failed' };
}

export class YoutubeService {
    constructor(private readonly createClient: ClientFactory = defaultClientFactory) {}

    async playlists(): Promise<PlaylistsResponse | null> {
        const client = await this.createClient();
        return client ? client.playlists() : null;
    }

    async itemCount(playlistId: string): Promise<ReadFailure | { status: 'ok'; itemCount: number }> {
        const client = await this.createClient();
        if (!client) return { status: 'not_connected' };
        try {
            return { status: 'ok', itemCount: await client.playlistItemCount(playlistId) };
        } catch (error) {
            return readFailure(error);
        }
    }

    async listItems(playlistId: string): Promise<ReadFailure | { status: 'ok'; items: PlaylistEntry[] }> {
        const client = await this.createClient();
        if (!client) return { status: 'not_connected' };
        try {
            return { status: 'ok', items: toEntries(await client.listPlaylistItems(playlistId)) };
        } catch (error) {
            return readFailure(error);
        }
    }

    /** Dry-run: mostra o que seria removido e quanto custaria, sem apagar nada. */
    async previewDuplicates(playlistId: string): Promise<ReadFailure | ({ status: 'ok' } & DuplicatesPreview)> {
        const listed = await this.listItems(playlistId);
        if (listed.status !== 'ok') return listed;
        return { status: 'ok', ...buildPreview(playlistId, listed.items) };
    }

    /**
     * Remove os duplicados só se `confirm` for igual ao número de duplicados encontrados agora
     * (o mesmo que o dry-run mostrou). Antes de apagar, grava um backup da playlist inteira.
     */
    async removeDuplicates(playlistId: string, confirm: number | undefined): Promise<RemoveDuplicatesResult> {
        const client = await this.createClient();
        if (!client) return { status: 'not_connected' };

        let entries: PlaylistEntry[];
        try {
            entries = toEntries(await client.listPlaylistItems(playlistId));
        } catch (error) {
            return readFailure(error);
        }

        const preview = buildPreview(playlistId, entries);
        if (preview.duplicates.length === 0) return { status: 'no_duplicates', ...preview };
        if (confirm !== preview.duplicates.length) return { status: 'confirmation_required', ...preview };

        const backupFile = writeBackup(playlistId, entries);
        const result = await client.deleteItemsById(preview.duplicates.map((item) => item.playlistItemId));
        recordRemoval(backupFile, result);

        return { status: 'done', backupFile, ...preview, ...result };
    }
}

function buildPreview(playlistId: string, entries: PlaylistEntry[]): DuplicatesPreview {
    const { unique, duplicates } = findDuplicates(entries);
    return {
        playlistId,
        itemCount: entries.length,
        unique: unique.length,
        duplicates,
        quota: estimateRemovalQuota(entries.length, duplicates.length),
    };
}
