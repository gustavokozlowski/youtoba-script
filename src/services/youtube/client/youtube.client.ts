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
        });
    }

    async playlists(): Promise<PlaylistsResponse | null> {
        try {
            const response = await this.client.get(`playlists?part=contentDetails&mine=true&key=${this.apiKey}`);
            return response.data as PlaylistsResponse;
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
}
