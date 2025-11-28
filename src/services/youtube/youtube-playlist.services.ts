require('dotenv').config();

import { getToken } from '../../utils/repository/user.repository';
import type { PlaylistItem, PlaylistsResponse } from './client/client.types';
import { YoutubeClient } from './client/youtube.client';

const { API_KEY } = process.env;
export class YoutubeService {
    token: string | undefined;
    client: YoutubeClient | undefined;

    async playlists(): Promise<PlaylistsResponse | null> {
        await this._getCredentials();
        const result = await this.client?.playlists();

        if (!result) {
            return null;
        }

        return result;
    }

    async playlistDetailsById(playlistId: string) {
        await this._getCredentials();
        const playlistInfo = await this.client?.playlistDetails(playlistId);

        if (!playlistInfo) {
            return null;
        }

        const { totalResults } = playlistInfo.pageInfo;

        return {
            mensagem: 'OLHA SÓ OS DETALHES DA PLAYLIST AQUI!',
            totalPages: totalResults,
        };
    }

    async _playlistDuplicateItems(playlistId: string) {
        let initialPlaylist: PlaylistItem[] = [];
        await this._getCredentials();
        const result = await this.client?.playlist(playlistId);

        if (!result) {
            return null;
        }

        const { items, nextPageToken } = result;
        const firstList = items.map((item: PlaylistItem) => item);

        initialPlaylist = [...firstList];

        let nextPageTokenVar = nextPageToken;

        while (nextPageTokenVar) {
            const nextPage = await this.client?.nextPlaylistPage(playlistId, nextPageTokenVar);

            if (nextPage?.items) {
                const playlistData = nextPage;

                playlistData.items.map((item: PlaylistItem) => initialPlaylist.push(item));

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
        await this._getCredentials();
        const duplicatedVideos = await this._playlistDuplicateItems(playlistId);
        if (!duplicatedVideos || duplicatedVideos.length === 0) {
            return {
                mensagem: 'Nenhum item duplicado encontrado na playlist!',
                resultado: [],
            };
        }
        const itemsToDelete = duplicatedVideos.map((item) => item.id);
        const result = await this.client?.deleteItemsById(itemsToDelete);

        if (result) {
            return {
                mensagem: 'Itens deletados com sucesso!',
                resultado: result,
            };
        }

        return {
            mensagem: 'Erro ao deletar os itens da playlist!',
            resultado: result,
        };
    }

    private _filterDuplicatedItemsById = (list: PlaylistItem[]) => {
        const filteredList: PlaylistItem[] = [];
        const duplicatedItemsList: PlaylistItem[] = [];

        list.forEach((item) => {
            const videoId = item?.contentDetails?.videoId;
            !filteredList.some((i) => i.contentDetails?.videoId === videoId)
                ? filteredList.push(item)
                : duplicatedItemsList.push(item);
        });

        return duplicatedItemsList;
    };

    private async _getCredentials() {
        const apiKey = API_KEY;
        const { token } = await getToken('bearerToken');

        if (!token || typeof token === 'undefined' || !apiKey) {
            console.info('DEU MERDA AQUI NA PORRA DO TOKEN DO YOUTOBA HEIN PQP!');
            return undefined;
        }
        this.token = token;
        this.client = new YoutubeClient({ apiKey, token: this.token });
        return null;
    }
}
