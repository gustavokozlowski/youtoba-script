require('dotenv').config();

import type { PlaylistDetailsResponse, PlaylistResponse, PlaylistsResponse, YoutubeClientConfig } from './client.types';

const { YOUTUBE_BASE_URL, API_KEY } = process.env;

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
            const playlists = await this.client.get(`playlists?part=contentDetails&mine=true&key=${this.apiKey}`);
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

    async deleteItemsById(items: string[]): Promise<boolean | null> {
        try {
            switch (items.length) {
                case 0:
                    console.info('Nenhum item para deletar.');
                    return true;
                case 1:
                    await this.client.delete(
                        `https://youtube.googleapis.com/youtube/v3/playlistItems?id=${items[0]}&key=${API_KEY}`,
                    );
                    console.info('Item deletado com sucesso:', items[0]);
                    return true;
            }

            const requests = items.map(async (itemId: string) => {
                await this.client.delete(
                    `https://youtube.googleapis.com/youtube/v3/playlistItems?id=${itemId}&key=${API_KEY}`,
                );
            });

            const result = await Promise.all(requests);

            console.info('Itens deletados com sucesso:', result);

            return true;
        } catch (error: any) {
            console.error(`Erro ao deletar o item da playlist: ${items}`, error);
            return null;
        }
    }
}
