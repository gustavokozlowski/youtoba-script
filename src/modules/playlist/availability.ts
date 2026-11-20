import type { PlaylistItem } from '../../infra/youtube/youtube-api.types';
import type { Availability } from './playlist.types';

// Títulos que a API devolve para itens cujo vídeo foi apagado ou ficou privado.
const UNAVAILABLE_TITLES = new Map<string, Availability>([
    ['Deleted video', 'deleted'],
    ['Private video', 'private'],
]);

/**
 * Item de vídeo apagado ou privado. Só o título não basta: um vídeo real pode ter esse título,
 * mas ele tem data de publicação. Na dúvida, o item conta como disponível (nunca apaga por engano).
 */
export function availabilityOf(item: PlaylistItem): Availability | undefined {
    if (item.contentDetails?.videoPublishedAt) return undefined;
    return UNAVAILABLE_TITLES.get(item.snippet?.title ?? '');
}
