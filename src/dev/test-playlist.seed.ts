import type { YoutubeClient } from '../services/youtube/client/youtube.client';

export const TEST_PLAYLIST_TITLE = 'youtoba-teste';

// Vídeos públicos e estáveis. A ordem define quais cópias são "a primeira ocorrência".
const VIDEO_A = 'dQw4w9WgXcQ';
const VIDEO_B = 'jNQXAC9IVRw';
const VIDEO_C = '9bZkp7q19f0';
const VIDEO_D = 'kJQP7kiw5Fk';

// A duplicado 2x, B triplicado, C e D sem duplicata: 7 itens, 3 a remover, 4 devem ficar.
export const TEST_PLAYLIST_SEQUENCE = [VIDEO_A, VIDEO_B, VIDEO_C, VIDEO_A, VIDEO_B, VIDEO_D, VIDEO_B];

export const EXPECTED = {
    totalBefore: TEST_PLAYLIST_SEQUENCE.length,
    duplicatesToRemove: TEST_PLAYLIST_SEQUENCE.length - new Set(TEST_PLAYLIST_SEQUENCE).size,
    totalAfter: new Set(TEST_PLAYLIST_SEQUENCE).size,
};

export type SeedResult =
    | { status: 'exists'; playlistId: string }
    | {
          status: 'created';
          playlistId: string;
          inserted: { position: number; videoId: string }[];
          failed: { position: number; videoId: string; reason: string }[];
      };

const errorReason = (error: any): string =>
    error?.response?.data?.error?.errors?.[0]?.reason ?? error?.response?.status?.toString() ?? 'unknown';

export async function seedTestPlaylist(client: YoutubeClient): Promise<SeedResult> {
    const existing = await client.playlists();
    const found = existing?.items.find((playlist) => playlist.snippet?.title === TEST_PLAYLIST_TITLE);

    if (found) {
        return { status: 'exists', playlistId: found.id };
    }

    const playlist = await client.createPrivatePlaylist(
        TEST_PLAYLIST_TITLE,
        'Playlist de teste do youtoba-script. Criada automaticamente; pode apagar.',
    );

    const inserted: { position: number; videoId: string }[] = [];
    const failed: { position: number; videoId: string; reason: string }[] = [];

    // Sequencial de propósito: a ordem dos itens importa para o teste.
    for (const [position, videoId] of TEST_PLAYLIST_SEQUENCE.entries()) {
        try {
            await client.addVideoToPlaylist(playlist.id, videoId);
            inserted.push({ position, videoId });
        } catch (error) {
            failed.push({ position, videoId, reason: errorReason(error) });
        }
    }

    return { status: 'created', playlistId: playlist.id, inserted, failed };
}
