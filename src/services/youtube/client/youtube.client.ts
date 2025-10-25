require('dotenv').config();

import axios from 'axios';
import type { YoutubeClinetConfig } from './client.types';

const { YOUTUBE_BASE_URL } = process.env;

export class YoutubeClient {
    // Youtube client methods and properties here
    private client;
    private apiKey: string;

    constructor({ apiKey, token }: YoutubeClinetConfig) {
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

    public async getPlaylists() {
        try {
            const response = await this.client.get(`/playlists?part=contentDetails&mine=true&key=${this.apiKey}`);
            return response.data;
        } catch (error: any) {
            console.error('Error fetching playlists:', error);
            throw error;
        }
    }
}
