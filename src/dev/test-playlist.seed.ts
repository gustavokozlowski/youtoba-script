import { apiFailure, PAGE_SIZE, type YoutubeClient } from '../services/youtube/client/youtube.client';
import type { SeedResult } from './test-playlist.types';

export const TEST_PLAYLIST_TITLE = 'youtoba-teste';
export const LARGE_TEST_PLAYLIST_TITLE = 'youtoba-teste-grande';

// Vídeos públicos e estáveis. A ordem define quais cópias são "a primeira ocorrência".
const VIDEO_A = 'dQw4w9WgXcQ';
const VIDEO_B = 'jNQXAC9IVRw';
const VIDEO_C = '9bZkp7q19f0';
const VIDEO_D = 'kJQP7kiw5Fk';
const BASE_VIDEOS = [VIDEO_A, VIDEO_B, VIDEO_C, VIDEO_D];

// A duplicado 2x, B triplicado, C e D sem duplicata: 7 itens, 3 a remover, 4 devem ficar.
export const TEST_PLAYLIST_SEQUENCE = [VIDEO_A, VIDEO_B, VIDEO_C, VIDEO_A, VIDEO_B, VIDEO_D, VIDEO_B];

export const expectedFor = (sequence: string[]) => ({
    totalBefore: sequence.length,
    duplicatesToRemove: sequence.length - new Set(sequence).size,
    totalAfter: new Set(sequence).size,
});

/**
 * Playlist com mais de uma página: 4 vídeos fixos + até 50 vídeos distintos de uma busca,
 * depois 2 cópias que caem na segunda página. Uma delas duplica o item da posição 1 (página 1),
 * o que testa a detecção entre páginas.
 */
export async function largeTestSequence(client: YoutubeClient): Promise<string[]> {
    const found = await client.searchVideoIds('timelapse nature 4k', PAGE_SIZE);
    const distinct = [...new Set(found)].filter((id) => !BASE_VIDEOS.includes(id));
    const base = [...BASE_VIDEOS, ...distinct];
    if (base.length <= PAGE_SIZE) {
        throw new Error(`A busca trouxe só ${distinct.length} vídeos; a playlist não passaria de uma página.`);
    }
    return [...base, VIDEO_B, distinct[10]];
}

export async function seedPlaylist(client: YoutubeClient, title: string, sequence: string[]): Promise<SeedResult> {
    const existing = await client.playlists();
    const found = existing?.items.find((playlist) => playlist.snippet?.title === title);

    if (found) {
        return { status: 'exists', playlistId: found.id };
    }

    const playlist = await client.createPrivatePlaylist(
        title,
        'Playlist de teste do youtoba-script. Criada automaticamente; pode apagar.',
    );

    const inserted: { position: number; videoId: string }[] = [];
    const failed: { position: number; videoId: string; reason: string }[] = [];

    // Sequencial de propósito: a ordem dos itens importa para o teste.
    for (const [position, videoId] of sequence.entries()) {
        try {
            await client.addVideoToPlaylist(playlist.id, videoId);
            inserted.push({ position, videoId });
        } catch (error) {
            const { status, reason } = apiFailure(error);
            failed.push({ position, videoId, reason: reason ?? String(status ?? 'unknown') });
        }
    }

    return { status: 'created', playlistId: playlist.id, inserted, failed };
}
