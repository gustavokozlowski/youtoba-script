import { youtube, type youtube_v3 } from '@googleapis/youtube';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../../shared/logger';
import { apiFailure } from './api-failure';
import { runOneByOne } from './one-by-one';
import type { OneByOneProgressEvent } from './one-by-one.types';
import { withRetry } from './retry';
import { PAGE_SIZE, QUOTA_COST } from './youtube.constants';
import { mapPlaylist, mapPlaylistItem } from './youtube.mapper';
import type {
    AddOptions,
    AddProgressEvent,
    AddVideosResult,
    DeleteItemsResult,
    DeleteOptions,
    DeleteProgressEvent,
    Playlist,
    PlaylistItem,
    PlaylistsResponse,
    RetryOptions,
    YoutubeClientConfig,
    YoutubeClientOptions,
} from './youtube-api.types';

/** Traduz o evento genérico para o da remoção (`succeeded` vira `removed`). */
const toDeleteProgress = (event: OneByOneProgressEvent): DeleteProgressEvent => ({
    ...event,
    outcome: event.outcome === 'succeeded' ? 'removed' : 'failed',
});

/** Junta ao evento o item recém-criado (o último de `added`, já que a adição é em série). */
const withCreatedItem = (event: OneByOneProgressEvent, added: AddVideosResult['added']): AddProgressEvent =>
    event.outcome === 'succeeded' ? { ...event, playlistItemId: added[added.length - 1]?.playlistItemId } : event;

/** Cliente HTTP da YouTube Data API v3. Use pelo createTrackedClient, que soma o custo na quota do dia. */
export class YoutubeClient {
    private readonly youtube: youtube_v3.Youtube;
    private readonly apiKey: string;
    private readonly retry: RetryOptions;
    private readonly onCost: ((units: number) => void) | undefined;
    private readonly onQuotaExceeded: (() => void) | undefined;

    constructor({ apiKey, token }: YoutubeClientConfig, options: YoutubeClientOptions = {}) {
        this.apiKey = apiKey;
        this.retry = { retries: options.retries ?? 3, baseDelayMs: options.baseDelayMs ?? 1000 };
        this.onCost = options.onCost;
        this.onQuotaExceeded = options.onQuotaExceeded;
        const auth = new OAuth2Client();
        auth.setCredentials({ access_token: token });
        this.youtube = youtube({ version: 'v3', auth });
    }

    async playlists(): Promise<PlaylistsResponse | null> {
        try {
            const response = await this.counted(QUOTA_COST.list, () =>
                this.youtube.playlists.list(
                    {
                        part: ['snippet', 'contentDetails'],
                        mine: true,
                        maxResults: PAGE_SIZE,
                        key: this.apiKey,
                    },
                    { timeout: 15_000 },
                ),
            );
            return {
                kind: response.data.kind ?? '',
                etag: response.data.etag ?? '',
                nextPageToken: response.data.nextPageToken ?? undefined,
                prevPageToken: response.data.prevPageToken ?? undefined,
                pageInfo: {
                    totalResults: response.data.pageInfo?.totalResults ?? 0,
                    resultsPerPage: response.data.pageInfo?.resultsPerPage ?? 0,
                },
                items: (response.data.items ?? []).map(mapPlaylist),
            };
        } catch (error) {
            const { status, reason } = apiFailure(error);
            logger.warn({ status, reason }, 'Erro ao obter playlists');
            return null;
        }
    }

    /** Todas as playlists do usuário, com capa, contagem e privacidade (1 unidade a cada 50 playlists). Lança em erro. */
    listMyPlaylists(): Promise<Playlist[]> {
        return this.allPlaylistPages();
    }

    /** Todos os itens da playlist, em páginas de 50 (1 unidade de quota por página). Lança em caso de erro. */
    listPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
        return this.allPlaylistItemPages(playlistId);
    }

    /** Total de itens da playlist, numa única chamada (1 unidade de quota). */
    async playlistItemCount(playlistId: string): Promise<number> {
        const response = await this.counted(QUOTA_COST.list, () =>
            this.youtube.playlistItems.list(
                {
                    part: ['id'],
                    playlistId,
                    maxResults: 1,
                    key: this.apiKey,
                },
                { timeout: 15_000 },
            ),
        );
        return response.data.pageInfo?.totalResults ?? 0;
    }

    async createPrivatePlaylist(title: string, description: string): Promise<Playlist> {
        const response = await this.counted(QUOTA_COST.insert, () =>
            this.youtube.playlists.insert(
                {
                    part: ['snippet', 'status'],
                    requestBody: { snippet: { title, description }, status: { privacyStatus: 'private' } },
                    key: this.apiKey,
                },
                { timeout: 15_000 },
            ),
        );
        return mapPlaylist(response.data);
    }

    async addVideoToPlaylist(playlistId: string, videoId: string, position?: number): Promise<PlaylistItem> {
        const response = await withRetry(
            () =>
                this.counted(QUOTA_COST.insert, () =>
                    this.youtube.playlistItems.insert(
                        {
                            part: ['snippet'],
                            requestBody: {
                                snippet: {
                                    playlistId,
                                    resourceId: { kind: 'youtube#video', videoId },
                                    ...(position === undefined ? {} : { position }),
                                },
                            },
                            key: this.apiKey,
                        },
                        { timeout: 15_000 },
                    ),
                ),
            this.retry,
        );
        return mapPlaylistItem(response.data);
    }

    /** Ids de vídeos públicos para montar playlists de teste (search.list custa 100 unidades). */
    async searchVideoIds(query: string, max = PAGE_SIZE): Promise<string[]> {
        const response = await this.counted(QUOTA_COST.search, () =>
            this.youtube.search.list(
                {
                    part: ['id'],
                    type: ['video'],
                    safeSearch: 'strict',
                    maxResults: max,
                    q: query,
                    key: this.apiKey,
                },
                { timeout: 15_000 },
            ),
        );
        return (response.data.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
    }

    /** Apaga os itens um por vez, parando no saldo do dia ou no quotaExceeded (ver `runOneByOne`). */
    async deleteItemsById(itemIds: string[], { canSpend, onProgress }: DeleteOptions = {}): Promise<DeleteItemsResult> {
        const { succeeded, failed } = await runOneByOne(itemIds, QUOTA_COST.delete, (id) => this.deleteOne(id), {
            canSpend,
            onProgress: onProgress && ((event) => onProgress(toDeleteProgress(event))),
        });
        return { removed: succeeded, failed };
    }

    /**
     * Acrescenta os vídeos ao fim da playlist, um por vez, e devolve o id do item criado (o Mix precisa dele
     * para desfazer). Mesmas regras de quota e de parada da remoção.
     */
    async addVideosToPlaylist(
        playlistId: string,
        videoIds: string[],
        { canSpend, onProgress }: AddOptions = {},
    ): Promise<AddVideosResult> {
        const added: AddVideosResult['added'] = [];
        const { failed } = await runOneByOne(
            videoIds,
            QUOTA_COST.insert,
            (videoId) => this.addOne(playlistId, videoId, added),
            { canSpend, onProgress: onProgress && ((event) => onProgress(withCreatedItem(event, added))) },
        );
        return { added, failed };
    }

    /** Insere um vídeo no fim e registra o item criado em `added`; devolve a falha, ou undefined se deu certo. */
    private async addOne(playlistId: string, videoId: string, added: AddVideosResult['added']) {
        try {
            const item = await this.addVideoToPlaylist(playlistId, videoId);
            added.push({ videoId, playlistItemId: item.id });
            return undefined;
        } catch (error) {
            const failure = apiFailure(error);
            logger.warn({ videoId, status: failure.status, reason: failure.reason }, 'Falha ao adicionar o vídeo');
            return failure;
        }
    }

    /** Apaga um item; devolve a falha, ou undefined se deu certo. */
    private async deleteOne(itemId: string) {
        try {
            await withRetry(
                () =>
                    this.counted(QUOTA_COST.delete, () =>
                        this.youtube.playlistItems.delete(
                            {
                                id: itemId,
                                key: this.apiKey,
                            },
                            { timeout: 15_000 },
                        ),
                    ),
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

    /** Lê todas as páginas de playlists (cada página de 50 conta 1 unidade). */
    private async allPlaylistPages(): Promise<Playlist[]> {
        const playlists: Playlist[] = [];
        let pageToken: string | undefined;
        do {
            const response = await withRetry(
                () =>
                    this.counted(QUOTA_COST.list, () =>
                        this.youtube.playlists.list(
                            {
                                part: ['snippet', 'contentDetails', 'status'],
                                mine: true,
                                maxResults: PAGE_SIZE,
                                pageToken,
                                key: this.apiKey,
                            },
                            { timeout: 15_000 },
                        ),
                    ),
                this.retry,
            );
            playlists.push(...(response.data.items ?? []).map(mapPlaylist));
            pageToken = response.data.nextPageToken ?? undefined;
        } while (pageToken);
        return playlists;
    }

    /** Lê todas as páginas dos itens (cada página de 50 conta 1 unidade). */
    private async allPlaylistItemPages(playlistId: string): Promise<PlaylistItem[]> {
        const items: PlaylistItem[] = [];
        let pageToken: string | undefined;
        do {
            const response = await withRetry(
                () =>
                    this.counted(QUOTA_COST.list, () =>
                        this.youtube.playlistItems.list(
                            {
                                part: ['snippet', 'contentDetails'],
                                playlistId,
                                maxResults: PAGE_SIZE,
                                pageToken,
                                key: this.apiKey,
                            },
                            { timeout: 15_000 },
                        ),
                    ),
                this.retry,
            );
            items.push(...(response.data.items ?? []).map(mapPlaylistItem));
            pageToken = response.data.nextPageToken ?? undefined;
        } while (pageToken);
        return items;
    }

    private async counted<T>(units: number, request: () => Promise<T>): Promise<T> {
        try {
            const response = await request();
            this.onCost?.(units);
            return response;
        } catch (error) {
            const failure = apiFailure(error);
            if (failure.status !== undefined) {
                this.onCost?.(units);
                if (failure.reason === 'quotaExceeded') this.onQuotaExceeded?.();
            }
            throw error;
        }
    }
}
