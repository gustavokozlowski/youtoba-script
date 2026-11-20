import { num } from '../../shared/lib/format';
import type { FitToday } from './ReviewScreen.types';

/** Quantos dos `total` itens cabem na cota de hoje, em texto. */
export function fitToday(fits: number, total: number): FitToday {
    if (fits >= total) return { text: `Sim, os ${num(total)}`, tone: 'yes' };
    if (fits === 0) return { text: 'Nenhum', tone: 'partial' };
    return { text: `${num(fits)} de ${num(total)}`, tone: 'partial' };
}
