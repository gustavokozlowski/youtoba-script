import axios, { type AxiosInstance } from 'axios';
import { setting } from '../../config/settings';
import { logger } from '../../shared/logger';
import { apiFailure } from './api-failure';
import { withRetry } from './retry';
import { PAGE_SIZE, QUOTA_COST, requestCost } from './youtube.constants';
import type {
    DeleteItemsResult,
    DeleteOptions,
    Page,
    Playlist,
    PlaylistItem,
    PlaylistResponse,
    PlaylistsResponse,
    RetryOptions,
    SearchResponse,
    YoutubeClientConfig,
    YoutubeClientOptions,
} from './youtube-api.types';

/** Cliente HTTP da YouTube Data API v3. Use pelo createTrackedClient, que soma o custo na quota do dia. */
export class YoutubeClient {
    private readonly client: AxiosInstance;
    private readonly apiKey: string;
    private readonly retry: RetryOptions;

    constructor({ apiKey, token }: YoutubeClientConfig, options: YoutubeClientOptions = {}) {
        this.apiKey = apiKey;
        this.retry = { retries: options.retries ?? 3, baseDelayMs: options.baseDelayMs ?? 1000 };
        this.client = axios.create({
            baseURL: setting('YOUTUBE_BASE_URL'),
            timeout: 15_000,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
        this.countCosts(options);
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
    listMyPlaylists(): Promise<Playlist[]> {
        return this.allPages<Playlist>('playlists', { part: 'snippet,contentDetails,status', mine: true });
    }

    /** Todos os itens da playlist, em páginas de 50 (1 unidade de quota por página). Lança em caso de erro. */
    listPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
        return this.allPages<PlaylistItem>('playlistItems', { part: 'snippet,contentDetails', playlistId });
    }

    /** Total de itens da playlist, numa única chamada (1 unidade de quota). */
    async playlistItemCount(playlistId: string): Promise<number> {
        const { data } = await this.client.get<PlaylistResponse>('playlistItems', {
            params: { part: 'id', playlistId, maxResults: 1, key: this.apiKey },
        });
        return data.pageInfo.totalResults;
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
        const snippet = {
            playlistId,
            resourceId: { kind: 'youtube#video', videoId },
            ...(position === undefined ? {} : { position }),
        };
        const { data } = await withRetry(
            () =>
                this.client.post<PlaylistItem>(
                    'playlistItems',
                    { snippet },
                    { params: { part: 'snippet', key: this.apiKey } },
                ),
            this.retry,
        );
        return data;
    }

    /** Ids de vídeos públicos para montar playlists de teste (search.list custa 100 unidades). */
    async searchVideoIds(query: string, max = PAGE_SIZE): Promise<string[]> {
        const { data } = await this.client.get<SearchResponse>('search', {
            params: { part: 'id', type: 'video', safeSearch: 'strict', maxResults: max, q: query, key: this.apiKey },
        });
        return data.items.map((item) => item.id.videoId).filter((id): id is string => Boolean(id));
    }

    /**
     * Apaga os itens um por vez (a API responde 409 a alterações simultâneas na mesma playlist). Antes de cada
     * item confere se ainda cabe na quota do dia (`canSpend`) e avisa o progresso. Para no saldo do dia ou no
     * quotaExceeded do Google, e marca o resto como pulado.
     */
    async deleteItemsById(itemIds: string[], { canSpend, onProgress }: DeleteOptions = {}): Promise<DeleteItemsResult> {
        const result: DeleteItemsResult = { removed: [], failed: [] };
        const skipFrom = (index: number, reason: string) => {
            result.failed.push(...itemIds.slice(index).map((id) => ({ id, reason })));
            return result;
        };

        for (const [index, itemId] of itemIds.entries()) {
            if (canSpend && !canSpend(QUOTA_COST.delete)) return skipFrom(index, 'skipped_daily_budget');
            const failure = await this.deleteOne(itemId);
            const progress = { index, total: itemIds.length, itemId };
            if (!failure) {
                result.removed.push(itemId);
                onProgress?.({ ...progress, outcome: 'removed' });
                continue;
            }
            result.failed.push({ id: itemId, status: failure.status, reason: failure.reason });
            onProgress?.({ ...progress, outcome: 'failed', status: failure.status, reason: failure.reason });
            if (failure.reason === 'quotaExceeded') return skipFrom(index + 1, 'skipped_quota_exceeded');
        }
        return result;
    }

    /** Apaga um item; devolve a falha, ou undefined se deu certo. */
    private async deleteOne(itemId: string) {
        try {
            await withRetry(
                () => this.client.delete('playlistItems', { params: { id: itemId, key: this.apiKey } }),
                this.retry,
            );
            return undefined;
        } catch (error) {
            const failure = apiFailure(error);
            logger.warn(
                { item: itemId, status: failure.status, reason: failure.reason, mensagem: failure.message },
                'Falha ao remover o item',
            );
            return failure;
        }
    }

    /** Lê todas as páginas de uma listagem (cada página de 50 conta 1 unidade). */
    private async allPages<T>(resource: string, params: Record<string, unknown>): Promise<T[]> {
        const items: T[] = [];
        let pageToken: string | undefined;
        do {
            const { data } = await withRetry(
                () =>
                    this.client.get<Page<T>>(resource, {
                        params: { ...params, maxResults: PAGE_SIZE, pageToken, key: this.apiKey },
                    }),
                this.retry,
            );
            items.push(...data.items);
            pageToken = data.nextPageToken;
        } while (pageToken);
        return items;
    }

    /** Toda chamada que chega ao Google conta na quota, inclusive as que falham e as repetições. */
    private countCosts({ onCost, onQuotaExceeded }: YoutubeClientOptions) {
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
}
