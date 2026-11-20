import type { YouTubeThumbnails } from '../../src/services/youtube/client/client.types';

export interface PlaylistItemFixture {
    id?: string;
    /** Sem videoId, o item vem sem contentDetails (vídeo apagado ou privado). */
    videoId?: string;
    position?: number;
    title?: string;
    thumbnails?: YouTubeThumbnails;
}

export interface PlaylistFixture {
    id?: string;
    title?: string;
    thumbnails?: YouTubeThumbnails;
}
