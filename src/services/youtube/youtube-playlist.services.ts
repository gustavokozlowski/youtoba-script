import { validateDuplicateItems } from '../../utils/helpers';
import type { PlaylistItem, PlaylistsResponse } from './client/client.types';
import type { YoutubeClient } from './client/youtube.client';
import type { FormattedPlaylistItem } from './types';

export class YoutubeService {
    client: YoutubeClient;

    constructor(client: YoutubeClient) {
        this.client = client;
    }

    async playlists(): Promise<PlaylistsResponse | null> {
      
        const result = await this.client?.playlists();

        if (!result) {
            return null;
        }

        return result;
    }

    async playlistDetailsById(playlistId: string) {
  
        const playlistInfo = await this.client?.playlistDetails(playlistId);

        if (!playlistInfo) {
            return null;
        }

        const { totalResults } = playlistInfo.pageInfo;
        const items = this._normalizePlaylistItems(playlistInfo.items);

        return {
            mensagem: 'OLHA SÓ OS DETALHES DA PLAYLIST AQUI!',
            totalPages: totalResults,
            items,
        };
    }

    async _playlistDuplicateItems(playlistId: string) {
        let initialPlaylist: FormattedPlaylistItem[] = [];

        const result = await this.client?.playlist(playlistId);

        if (!result) {
            return null;
        }

        const { items, nextPageToken } = result;
        const firstList = this._normalizePlaylistItems(items);

        initialPlaylist = [...firstList];

        let nextPageTokenVar = nextPageToken;

        while (nextPageTokenVar) {
            const nextPage = await this.client?.nextPlaylistPage(playlistId, nextPageTokenVar);

            if (nextPage?.items) {
                const playlistData = nextPage;

                const normalizedItems = this._normalizePlaylistItems(playlistData.items);
                initialPlaylist = [...initialPlaylist, ...normalizedItems];

                if (playlistData.nextPageToken) {
                    nextPageTokenVar = playlistData?.nextPageToken;
                } else {
                    break;
                }
            } else break;
        }

        const filteredPlaylist = this._filterDuplicatedItemsById(initialPlaylist);
        return filteredPlaylist;
    }

    async removeDuplicateVideos(playlistId: string) {

        const duplicatedVideos = await this._playlistDuplicateItems(playlistId);
        if (!duplicatedVideos || duplicatedVideos.length === 0) {
            return {
                mensagem: 'Nenhum item duplicado encontrado na playlist!',
            };
        }
        const itemsToDelete = duplicatedVideos.map((item) => item.videoId);
        const result = await this.client?.deleteItemsById(itemsToDelete);

        if (result) {
            return {
                mensagem: 'Itens deletados com sucesso!',
            };
        }

        return {
            mensagem: 'Erro ao deletar os itens da playlist!',
        };
    }

    private _filterDuplicatedItemsById = (list: FormattedPlaylistItem[]) => {
        const { duplicateItems} = validateDuplicateItems(list);
        return duplicateItems;
    };

    private _normalizePlaylistItems = (items: PlaylistItem[]): FormattedPlaylistItem[] => {

        return items.map((item) => ({
            playlistItemId: item.id,
            title: item.snippet?.title,
            videoId: item.contentDetails?.videoId,
            videoOwnerChannelTitle: item.snippet?.videoOwnerChannelTitle,
        }));
    }
}
