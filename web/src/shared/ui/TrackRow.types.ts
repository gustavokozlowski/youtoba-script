import type { DuplicateItem, JobItemState } from '../api/api.types';

export interface TrackRowProps {
    item: DuplicateItem;
    /** Sem estado: linha da revisão (mostra a primeira ocorrência). Com estado: linha da remoção. */
    state?: JobItemState | 'agora';
    /** Acabou de ser apagado: o risco de spray é desenhado na hora. */
    fresh?: boolean;
}

export interface SprayStrikeProps {
    seed: number;
}
