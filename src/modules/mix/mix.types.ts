import type { DuplicateEntry, PlaylistEntry } from '../playlist/playlist.types';

export interface MixSkipped {
    /** Mesmo videoId que já está na playlist de destino. */
    alreadyInTarget: PlaylistEntry[];
    /** Cópia posterior de um vídeo que aparece antes na origem (só a primeira entra). `firstPosition` = posição dessa primeira cópia na origem. */
    repeatedInSource: DuplicateEntry[];
    /** Apagado ou privado na origem (`entry.unavailable` preenchido). Nunca é adicionado. */
    unavailable: PlaylistEntry[];
}

export interface MixPlan {
    /** Entradas da origem que serão anexadas ao destino, na ordem da origem (por posição). */
    toAdd: PlaylistEntry[];
    skipped: MixSkipped;
}

/** Resultado da classificação de uma entrada da origem. */
export type MixBucket = 'toAdd' | 'unavailable' | 'alreadyInTarget' | 'repeatedInSource';
