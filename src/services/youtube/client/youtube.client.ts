require('dotenv').config();

import axios from 'axios';

import type {
    Playlist,
    PlaylistDetailsResponse,
    PlaylistItem,
    PlaylistResponse,
    PlaylistsResponse,
    YoutubeClientConfig,
} from './client.types';

const { YOUTUBE_BASE_URL, API_KEY } = process.env;

export type DeleteItemsResult = {
    removed: string[];
    failed: { id: string; status?: number; reason?: string }[];
};

const RETRYABLE_STATUS = new Set([409, 429, 500, 503]);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class YoutubeClient {
    private client;
    private apiKey: string;

    constructor({ apiKey, token }: YoutubeClientConfig) {
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL: YOUTUBE_BASE_URL,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
    }

    async playlists(): Promise<PlaylistsResponse | null> {
        try {
            const playlists = await this.client.get(
                `playlists?part=snippet,contentDetails&mine=true&maxResults=50&key=${this.apiKey}`,
            );
            return playlists.data as PlaylistsResponse;
        } catch (error: any) {
            console.error('Erro ao obter playlists:', error);
            return null;
        }
    }

    async playlistDetails(playlistId: string): Promise<PlaylistDetailsResponse | null> {
        try {
            const playlistInfo = await this.client.get(
                `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&key=${API_KEY}`,
            );

            return playlistInfo.data as PlaylistDetailsResponse;
        } catch (error: any) {
            console.error(`Deu merda para obter os detalhes da playlist: ${playlistId}`, error);
            return null;
        }
    }

    async playlist(playlistId: string): Promise<PlaylistResponse | null> {
        try {
            const playlist = await this.client.get(
                `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&key=${API_KEY}`,
            );

            return playlist.data as PlaylistResponse;
        } catch (error: any) {
            console.error(`Deu merda para obter os detalhes da playlist: ${playlistId}`, error);
            return null;
        }
    }

    async nextPlaylistPage(playlistId: string, nextPageToken: string): Promise<PlaylistResponse | null> {
        try {
            const nextPage = await this.client.get(
                `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&pageToken=${nextPageToken}&playlistId=${playlistId}&key=${API_KEY}`,
            );

            return nextPage.data as PlaylistResponse;
        } catch (error: any) {
            console.error(`Erro ao obter a próxima página da playlist: ${playlistId}`, error);
            return null;
        }
    }

    async deleteItemsById(
        itemIds: string[],
        { retries = 3, baseDelayMs = 1000 }: { retries?: number; baseDelayMs?: number } = {},
    ): Promise<DeleteItemsResult> {
        const result: DeleteItemsResult = { removed: [], failed: [] };

        // Sequencial de propósito: a API responde 409 a alterações simultâneas na mesma playlist.
        for (const [index, itemId] of itemIds.entries()) {
            const outcome = await this.deleteWithRetry(itemId, retries, baseDelayMs);

            if (outcome === 'removed') {
                result.removed.push(itemId);
                continue;
            }

            result.failed.push({ id: itemId, ...outcome });

            if (outcome.reason === 'quotaExceeded') {
                // Sem quota, as próximas tentativas também falhariam: interrompe e reporta o restante.
                for (const skipped of itemIds.slice(index + 1)) {
                    result.failed.push({ id: skipped, reason: 'skipped_quota_exceeded' });
                }
                break;
            }
        }

        return result;
    }

    private async deleteWithRetry(
        itemId: string,
        retries: number,
        baseDelayMs: number,
    ): Promise<'removed' | { status?: number; reason?: string }> {
        for (let attempt = 0; ; attempt++) {
            try {
                await this.client.delete(`playlistItems?id=${encodeURIComponent(itemId)}&key=${this.apiKey}`);
                return 'removed';
            } catch (error: any) {
                const status: number | undefined = error?.response?.status;
                const reason: string | undefined = error?.response?.data?.error?.errors?.[0]?.reason;

                if (status !== undefined && RETRYABLE_STATUS.has(status) && attempt < retries) {
                    await wait(baseDelayMs * 2 ** attempt);
                    continue;
                }

                // Loga só status e motivo: o objeto de erro do axios carrega o header Authorization.
                console.error(`Falha ao remover o item ${itemId}: HTTP ${status ?? '?'} ${reason ?? error?.message}`);
                return { status, reason };
            }
        }
    }

    async createPrivatePlaylist(title: string, description: string): Promise<Playlist> {
        const response = await this.client.post(`playlists?part=snippet,status&key=${this.apiKey}`, {
            snippet: { title, description },
            status: { privacyStatus: 'private' },
        });
        return response.data as Playlist;
    }

    async addVideoToPlaylist(playlistId: string, videoId: string): Promise<PlaylistItem> {
        const response = await this.client.post(`playlistItems?part=snippet&key=${this.apiKey}`, {
            snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } },
        });
        return response.data as PlaylistItem;
    }
}
