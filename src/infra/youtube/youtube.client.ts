import { setting } from '../../config/settings';
import { logger } from '../../shared/logger';

require('dotenv').config();

import axios, { type AxiosInstance } from 'axios';
import { httpErrorLike } from '../../shared/errors';
import type { GoogleApiErrorBody } from '../../shared/errors.types';
import { PAGE_SIZE, QUOTA_COST, requestCost } from './youtube.constants';
import type {
    ApiFailure,
    DeleteItemsResult,
    DeleteOptions,
    Playlist,
    PlaylistItem,
    PlaylistResponse,
    PlaylistsResponse,
    YoutubeClientConfig,
    YoutubeClientOptions,
} from './youtube-api.types';

const RETRYABLE_STATUS = new Set([409, 429, 500, 503]);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Extrai só o que importa do erro do axios. O objeto inteiro carrega o header Authorization.
export const apiFailure = (error: unknown): ApiFailure => {
    const { response, message } = httpErrorLike<GoogleApiErrorBody>(error);
    const body = response?.data?.error;
    return {
        status: response?.status,
        reason: body?.errors?.[0]?.reason,
        message: body?.message ?? (typeof message === 'string' ? message : undefined),
    };
};

export class YoutubeClient {
    private readonly client: AxiosInstance;
    private readonly apiKey: string;
    private readonly retries: number;
    private readonly baseDelayMs: number;

    constructor(
        { apiKey, token }: YoutubeClientConfig,
        { retries = 3, baseDelayMs = 1000, onCost, onQuotaExceeded }: YoutubeClientOptions = {},
    ) {
        this.apiKey = apiKey;
        this.retries = retries;
        this.baseDelayMs = baseDelayMs;
        this.client = axios.create({
            baseURL: setting('YOUTUBE_BASE_URL'),
            timeout: 15_000,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        // Toda chamada que chega ao Google conta na quota, inclusive as que falham e as repetições.
        this.client.interceptors.response.use(
            (response) => {
                onCost?.(requestCost(response.config.method, response.config.url));
                return response;
            },
            (error) => {
                if (error?.response) {
                    onCost?.(requestCost(error.config?.method, error.config?.url));
                    if (apiFailure(error).reason === 'quotaExceeded') onQuotaExceeded?.();
                }
                return Promise.reject(error);
            },
        );
    }

    async playlists(): Promise<PlaylistsResponse | null> {
        try {
            const { data } = await this.client.get<PlaylistsResponse>('playlists', {
                params: { part: 'snippet,contentDetails', mine: true, maxResults: PAGE_SIZE, key: this.apiKey },
            });
            return data;
        } catch (error) {
            const { status, reason } = apiFailure(error);
            logger.warn({ status, reason }, 'Erro ao obter playlists');
            return null;
        }
    }

    /** Todas as playlists do usuário, com capa, contagem e privacidade (1 unidade a cada 50 playlists). Lança em erro. */
    async listMyPlaylists(): Promise<Playlist[]> {
        const playlists: Playlist[] = [];
        let pageToken: string | undefined;

        do {
            const { data } = await this.withRetry(() =>
                this.client.get<PlaylistsResponse>('playlists', {
                    params: {
                        part: 'snippet,contentDetails,status',
                        mine: true,
                        maxResults: PAGE_SIZE,
                        pageToken,
                        key: this.apiKey,
                    },
                }),
            );
            playlists.push(...data.items);
            pageToken = data.nextPageToken;
        } while (pageToken);

        return playlists;
    }

    /** Total de itens da playlist, numa única chamada (1 unidade de quota). */
    async playlistItemCount(playlistId: string): Promise<number> {
        const { data } = await this.client.get<PlaylistResponse>('playlistItems', {
            params: { part: 'id', playlistId, maxResults: 1, key: this.apiKey },
        });
        return data.pageInfo.totalResults;
    }

    /** Todos os itens da playlist, em páginas de 50 (1 unidade de quota por página). Lança em caso de erro. */
    async listPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
        const items: PlaylistItem[] = [];
        let pageToken: string | undefined;

        do {
            const { data } = await this.withRetry(() =>
                this.client.get<PlaylistResponse>('playlistItems', {
                    params: {
                        part: 'snippet,contentDetails',
                        playlistId,
                        maxResults: PAGE_SIZE,
                        pageToken,
                        key: this.apiKey,
                    },
                }),
            );
            items.push(...data.items);
            pageToken = data.nextPageToken;
        } while (pageToken);

        return items;
    }

    async createPrivatePlaylist(title: string, description: string): Promise<Playlist> {
        const { data } = await this.client.post<Playlist>(
            'playlists',
            { snippet: { title, description }, status: { privacyStatus: 'private' } },
            { params: { part: 'snippet,status', key: this.apiKey } },
        );
        return data;
    }

    async addVideoToPlaylist(playlistId: string, videoId: string, position?: number): Promise<PlaylistItem> {
        const { data } = await this.withRetry(() =>
            this.client.post<PlaylistItem>(
                'playlistItems',
                {
                    snippet: {
                        playlistId,
                        resourceId: { kind: 'youtube#video', videoId },
                        ...(position === undefined ? {} : { position }),
                    },
                },
                { params: { part: 'snippet', key: this.apiKey } },
            ),
        );
        return data;
    }

    /** Ids de vídeos públicos para montar playlists de teste (search.list custa 100 unidades). */
    async searchVideoIds(query: string, max = PAGE_SIZE): Promise<string[]> {
        const { data } = await this.client.get<{ items: { id: { videoId?: string } }[] }>('search', {
            params: {
                part: 'id',
                type: 'video',
                safeSearch: 'strict',
                maxResults: max,
                q: query,
                key: this.apiKey,
            },
        });
        return data.items.map((item) => item.id.videoId).filter((id): id is string => Boolean(id));
    }

    /**
     * Apaga os itens um por vez. Antes de cada item confere se ainda cabe na quota do dia (`canSpend`)
     * e avisa o progresso (`onProgress`). Para no saldo do dia ou no quotaExceeded do Google.
     */
    async deleteItemsById(itemIds: string[], { canSpend, onProgress }: DeleteOptions = {}): Promise<DeleteItemsResult> {
        const result: DeleteItemsResult = { removed: [], failed: [] };
        const skipRest = (from: number, reason: string) => {
            for (const skipped of itemIds.slice(from)) {
                result.failed.push({ id: skipped, reason });
            }
        };

        // Sequencial de propósito: a API responde 409 a alterações simultâneas na mesma playlist.
        for (const [index, itemId] of itemIds.entries()) {
            if (canSpend && !canSpend(QUOTA_COST.delete)) {
                skipRest(index, 'skipped_daily_budget');
                break;
            }

            try {
                await this.withRetry(() =>
                    this.client.delete('playlistItems', { params: { id: itemId, key: this.apiKey } }),
                );
                result.removed.push(itemId);
                onProgress?.({ index, total: itemIds.length, itemId, outcome: 'removed' });
            } catch (error) {
                const { status, reason, message } = apiFailure(error);
                logger.warn({ item: itemId, status, reason, mensagem: message }, 'Falha ao remover o item');
                result.failed.push({ id: itemId, status, reason });
                onProgress?.({ index, total: itemIds.length, itemId, outcome: 'failed', status, reason });

                if (reason === 'quotaExceeded') {
                    // Sem quota, as próximas tentativas também falhariam: interrompe e reporta o restante.
                    skipRest(index + 1, 'skipped_quota_exceeded');
                    break;
                }
            }
        }

        return result;
    }

    // Repete em conflito e instabilidade, com espera exponencial (1 s, 2 s, 4 s por padrão).
    private async withRetry<T>(request: () => Promise<T>): Promise<T> {
        for (let attempt = 0; ; attempt++) {
            try {
                return await request();
            } catch (error) {
                const { status } = apiFailure(error);
                if (status !== undefined && RETRYABLE_STATUS.has(status) && attempt < this.retries) {
                    await wait(this.baseDelayMs * 2 ** attempt);
                    continue;
                }
                throw error;
            }
        }
    }
}
