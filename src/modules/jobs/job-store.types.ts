import type { MixJob } from '../mix/mix.types';
import type { RemovalJob } from '../removal/removal.types';

/** Qualquer job em segundo plano de uma playlist: um rodando bloqueia os outros da mesma playlist. */
export type PlaylistJob = RemovalJob | MixJob;

export interface StoredJob {
    id: string;
    playlistId: string;
    status: string;
}
