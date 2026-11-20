import { href } from '../../shared/lib/route-links';
import { Icon } from '../../shared/ui/Icon';
import type { EmptyReviewProps } from './ReviewScreen.types';

export function EmptyReview({ title, children }: EmptyReviewProps) {
    return (
        <div className="empty">
            <h2>{title}</h2>
            <p>{children}</p>
            <a className="btn btn-ghost" href={href.playlists()}>
                <Icon name="back" />
                Voltar às playlists
            </a>
        </div>
    );
}
