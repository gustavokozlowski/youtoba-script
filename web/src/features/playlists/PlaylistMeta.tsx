import { quantity } from '../../shared/lib/format';
import { href } from '../../shared/lib/route-links';
import type { PlaylistMetaProps } from './PlaylistsScreen.types';

/** A linha miúda sob o título: privacidade e, se houver, o atalho para os vídeos apagados. */
export function PlaylistMeta({ playlist: p }: PlaylistMetaProps) {
    const hasDeleted = p.apagados > 0;
    if (!p.privacidade && !hasDeleted) return null;
    return (
        <div className="pl-meta">
            {p.privacidade}
            {p.privacidade && hasDeleted && ' · '}
            {hasDeleted && <a href={href.deleted(p.playlistId)}>{quantity(p.apagados, 'apagado', 'apagados')}</a>}
        </div>
    );
}
