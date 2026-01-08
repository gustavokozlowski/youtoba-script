require('dotenv').config();

import axios from 'axios';
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
            timeout: 120000 // 120 segundos
        });
    }

    async playlists(): Promise<PlaylistsResponse | null> {
        try {
            const playlists = await this.client.get(
                `playlists?part=snippet,contentDetails&mine=true&key=${this.apiKey}&maxResults=50`,
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
                `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&key=${API_KEY}&maxResults=50`,
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
                `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&key=${API_KEY}&maxResults=50`,
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
                `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&pageToken=${nextPageToken}&playlistId=${playlistId}&key=${API_KEY}&maxResults=50`,
            );

            return nextPage.data as PlaylistResponse;
        } catch (error: any) {
            console.error(`Erro ao obter a próxima página da playlist: ${playlistId}`, error);
            return null;
        }
    }

    async deleteItemsById(videosIds: string[]): Promise<boolean | null> {
        try {
            if (videosIds.length === 0) {
                console.info('Nenhum item para deletar');
                return true;
            }

            for (const videoId of videosIds) {
                try {
                    await this.client.delete(
                        `https://youtube.googleapis.com/youtube/v3/playlistItems?id=${videoId}&key=${API_KEY}`,
                    );
                    console.info('Video deletado com sucesso:', videoId);
                    // Aguarda 1 segundo entre requisições para evitar rate limiting
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                } catch (error: any) {
                    console.error(`Erro ao deletar o video ${videoId}:`, error.response?.status, error.message);
                    // Continua deletando outros vídeos mesmo que um falhe
                }
            }

            return true;
        } catch (error: any) {
            console.error(`Erro ao deletar itens da playlist: ${videosIds}`, error);
            return null;
        }
    }
}
