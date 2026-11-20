import { findDuplicates } from './duplicates';
import type { PlaylistEntry } from './playlist.types';

export { availabilityOf } from './availability';

/**
 * Os vídeos apagados a remover, por posição. A cópia de um apagado fica só na lista de duplicados,
 * para o mesmo item nunca entrar nas duas remoções.
 */
export const findDeleted = (entries: PlaylistEntry[]): PlaylistEntry[] =>
    findDuplicates(entries).unique.filter((entry) => entry.unavailable === 'deleted');
