import { num } from '../../shared/lib/format';
import { findPlaylist } from '../../shared/lib/overview-cache';
import { href } from '../../shared/lib/route-links';
import { Notice } from '../../shared/ui/Notice';
import type { ReviewHeaderProps, TrioProps } from './ReviewScreen.types';

function Trio({ preview }: TrioProps) {
    return (
        <div className="trio">
            <div>
                <strong className="num">{num(preview.totalItens)}</strong>
                <span>vídeos agora</span>
            </div>
            <div className="out">
                <strong className="num">{num(preview.duplicados)}</strong>
                <span>repetidos saem</span>
            </div>
            <div>
                <strong className="num">{num(preview.ficam)}</strong>
                <span>ficam</span>
            </div>
        </div>
    );
}

export function ReviewHeader({ playlistId, title, preview, loadError, changed }: ReviewHeaderProps) {
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
                    {preview ? <Trio preview={preview} /> : !loadError && <div className="skeleton trio-skeleton" />}
                </div>
            </div>
            {changed && preview && (
                <Notice tone="warn" title="A playlist mudou desde a revisão">
                    Agora são {num(preview.duplicados)} repetidos. Confira a lista de novo antes de confirmar.
                </Notice>
            )}
        </>
    );
}
