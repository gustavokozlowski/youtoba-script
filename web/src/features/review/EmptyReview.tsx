import { href } from '../../shared/lib/route-links';
import { Icon } from '../../shared/ui/Icon';
export function EmptyReview() {
    return (
        <div className="empty">
            <h2>Nada para tirar</h2>
            <p>Nenhum vídeo repetido nesta playlist. Cada vídeo aparece uma vez só.</p>
            <a className="btn btn-ghost" href={href.playlists()}>
                <Icon name="back" />
                Voltar às playlists
            </a>
        </div>
    );
}
