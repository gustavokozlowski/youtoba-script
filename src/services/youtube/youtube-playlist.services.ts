require('dotenv').config();

import axios from 'axios';
import type { Request, Response } from 'express';
import { getToken } from '../../utils/repository/user.repository';
import type { PlaylistItem, PlaylistResponse, PlaylistsResponse } from './client/client.types';
import { YoutubeClient } from './client/youtube.client';

const { API_KEY } = process.env;
export class YoutubeService {
    token: string | undefined;
    client: YoutubeClient | undefined;

    async getPlaylists(): Promise<PlaylistsResponse | null> {
        await this._getCredentials();
        const result = await this.client?.playlists();

        if (!result) {
            return null;
        }

        return result;
    }

    async getPlaylistDetailsById(playlistId: string) {
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

    // ESTAMOS FAZENDO AGORA A IMPLEMENTAÇÃO DA PAGINAÇÃO!!
    // PRECISAMOS PEGAS TODOS OS IDS REPETIDOS E RETORNAR A LISTA SOMENTE COM ELES.

    async getPlaylistItems(playlistId: string) {
        let initialPlaylist: PlaylistItem[] = [];

        try {
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

                if (nextPage && nextPage.items) {
                    const playlistData = nextPage;

                    playlistData.items.forEach((item: PlaylistItem) => initialPlaylist.push(item));

                    if (playlistData.nextPageToken) {
                        nextPageTokenVar = playlistData?.nextPageToken;
                    } else {
                        break;
                    }
                } else break;
            }

            const filteredPlaylist = this._removeItemsDuplicated(initialPlaylist);

            const originalLength = `Items na playlist original: ${initialPlaylist.length}`;
            const filteredLength = `Items na playlist filtrada: ${filteredPlaylist.length}`;

            console.info(originalLength, '\n', filteredLength);

            return filteredPlaylist;
        } catch (e) {
            console.error('Error daqueles', e);

            return null;
        }
    }

    async removeItemsById(items: string[]) {
        const requests = items.map(async (itemId: string) => {
            await axios.delete(`https://youtube.googleapis.com/youtube/v3/playlistItems?id=${itemId}&key=${API_KEY}`, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: 'application/json',
                },
            });
        });

        const result = await Promise.all(requests).catch((e: any) =>
            console.error('Fudeo pra excluir os videos!\n', e),
        );

        return result;
    }

    private _removeItemsDuplicated = (list: any[]) => {
        const newList = [] as any[];

        list.forEach((item) => {
            const videoId = item.contentDetails.videoId;
            if (!newList.some((i) => i.contentDetails.videoId === videoId)) {
                newList.push(item);
            }
        });

        return newList;
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
