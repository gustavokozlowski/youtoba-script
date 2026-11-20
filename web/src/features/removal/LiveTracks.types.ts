import type { RemovalJob } from '../../shared/api/api.types';

export interface LiveTracksProps {
    rows: RemovalJob['itens'];
    current?: RemovalJob['itens'][number];
    fresh: Set<string>;
    /** Enquanto apaga, a janela de linhas anda: as linhas deslizam. Terminado, a lista inteira aparece parada. */
    moving: boolean;
}
