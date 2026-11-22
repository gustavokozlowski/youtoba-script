import type { RemovalJob } from '../removal/removal.types';

/** Qualquer job em segundo plano de uma playlist. Ao entrar o Mix, vira `RemovalJob | MixJob`. */
export type PlaylistJob = RemovalJob;

export interface StoredJob {
    id: string;
    playlistId: string;
    status: string;
}
