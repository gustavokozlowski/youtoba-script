import type { RemovalKind } from '../../shared/api/api.types';
import { quantity } from '../../shared/lib/format';
import type { RemovalKindCopy } from './RemovalScreen.types';

/** Os textos que dependem do que a remoção tirou (repetidos ou vídeos apagados). */
export const KIND_COPY: Record<RemovalKind, RemovalKindCopy> = {
    duplicados: {
        label: 'repetidos',
        headings: {
            running: 'Apagando repetidos',
            done: 'Pronto, repetidos apagados',
            partial: 'Remoção pausada',
            failed: 'A remoção parou com erro',
        },
        shortcut: 'Como desfazer',
        doneTitle: (n) => quantity(n, 'vídeo repetido saiu', 'vídeos repetidos saíram'),
        doneNote: 'A primeira vez de cada vídeo continua na playlist, na ordem de antes.',
    },
    apagados: {
        label: 'apagados',
        headings: {
            running: 'Tirando vídeos apagados',
            done: 'Pronto, vídeos apagados removidos',
            partial: 'Remoção pausada',
            failed: 'A remoção parou com erro',
        },
        shortcut: 'Ver o backup',
        doneTitle: (n) => quantity(n, 'vídeo apagado saiu', 'vídeos apagados saíram'),
        doneNote: 'O resto da playlist continua na ordem de antes.',
    },
};

/** Jobs de antes do tipo existir (servidor antigo, testes) eram todos de repetidos. */
export const kindOf = (tipo: RemovalKind | undefined): RemovalKind => tipo ?? 'duplicados';
