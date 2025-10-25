require('dotenv').config();
import axios from 'axios';
const { YOUTUBE_BASE_UR } = process.env;

export class YoutubeClient {
    // Youtube client methods and properties here
    private client;
    private apiKey: string;
    private baseURL: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.baseURL = YOUTUBE_BASE_UR ?? '';
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
    }


    public async getPlaylists(token: string) {
        try {
            const response = await this.client.get(`/playlists?part=contentDetails&mine=true&key=${this.apiKey}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching playlists:', error);
            throw error;
        }
    }
}