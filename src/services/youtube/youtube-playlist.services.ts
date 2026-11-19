require('dotenv').config();

import { googleAuth } from '../google';
import type { PlaylistItem, PlaylistsResponse } from './client/client.types';
import { type DeleteItemsResult, YoutubeClient } from './client/youtube.client';

export type RemoveDuplicatesResult =
    | { status: 'not_connected' }
    | { status: 'fetch_failed' }
    | { status: 'no_duplicates' }
    | ({ status: 'done'; found: number } & DeleteItemsResult);

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

    async removeDuplicateVideos(playlistId: string): Promise<RemoveDuplicatesResult> {
        await this._getCredentials();

        if (!this.client) {
            return { status: 'not_connected' };
        }

        const duplicatedVideos = await this._playlistDuplicateItems(playlistId);

        if (duplicatedVideos === null) {
            return { status: 'fetch_failed' };
        }

        if (duplicatedVideos.length === 0) {
            return { status: 'no_duplicates' };
        }

        const { removed, failed } = await this.client.deleteItemsById(duplicatedVideos.map((item) => item.id));
        return { status: 'done', found: duplicatedVideos.length, removed, failed };
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
        const token = await googleAuth().getAccessToken();

        if (!token || !apiKey) {
            // Sem login (ou login expirado): não reaproveita um cliente de uma chamada anterior.
            this.token = undefined;
            this.client = undefined;
            return;
        }

        this.token = token;
        this.client = new YoutubeClient({ apiKey, token });
    }
}
