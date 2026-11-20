import type { DeletedItem, JobItemState } from '../api/api.types';

export interface TrackRowProps {
    /** Com `primeiraOcorrencia` (repetido) a linha da revisão mostra onde o vídeo aparece primeiro. */
    item: DeletedItem & { primeiraOcorrencia?: number };
    /** Sem estado: linha da revisão (mostra a primeira ocorrência). Com estado: linha da remoção. */
    state?: JobItemState | 'agora';
    /** Acabou de ser apagado: o buff é rolado na hora. */
    fresh?: boolean;
}

export interface TrackTailProps {
    item: TrackRowProps['item'];
    state: TrackRowProps['state'];
}
