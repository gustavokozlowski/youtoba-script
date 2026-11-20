import { quantity } from '../../shared/lib/format';
import { href } from '../../shared/lib/route-links';
import type { DeletedLinkProps } from './ReviewScreen.types';

/** Atalho discreto para a revisão dos vídeos apagados (some quando a playlist não tem nenhum). */
export function DeletedLink({ playlistId, count }: DeletedLinkProps) {
    if (count === 0) return null;
    return (
        <p className="aside-line">
            <a href={href.deleted(playlistId)}>{quantity(count, 'vídeo apagado', 'vídeos apagados')}</a> nesta playlist
        </p>
    );
}
