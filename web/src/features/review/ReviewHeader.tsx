import { num } from '../../shared/lib/format';
import { findPlaylist } from '../../shared/lib/overview-cache';
import { href } from '../../shared/lib/route-links';
import type { ReviewHeaderProps, TrioProps } from './ReviewScreen.types';

function Trio({ total, leaving, staying, leavingLabel }: TrioProps) {
    return (
        <div className="trio">
            <div>
                <strong className="num">{num(total)}</strong>
                <span>vídeos agora</span>
            </div>
            <div className="out">
                <strong className="num">{num(leaving)}</strong>
                <span>{leavingLabel}</span>
            </div>
            <div>
                <strong className="num">{num(staying)}</strong>
                <span>ficam</span>
            </div>
        </div>
    );
}

/** O topo da revisão (repetidos ou apagados): migalha, capa, título e os três números. */
export function ReviewHeader({ playlistId, title, trio, loadError, notice }: ReviewHeaderProps) {
    const known = findPlaylist(playlistId);
    return (
        <>
            <p className="crumb">
                <a href={href.playlists()}>Playlists</a> / {title}
            </p>
            <div className="review-head">
                {known?.capa ? <img className="cover" src={known.capa} alt="" /> : <span className="cover" />}
                <div>
                    <h1>{title}</h1>
                    {trio && <Trio {...trio} />}
                    {!trio && !loadError && <div className="skeleton trio-skeleton" />}
                </div>
            </div>
            {notice}
        </>
    );
}
