import { href } from '../../shared/lib/route-links';
import { Icon } from '../../shared/ui/Icon';
import type { AsidePanelProps } from './RemovalScreen.types';

/** O painel lateral da remoção de apagados: não há o que restaurar, só o aviso e onde está o backup. */
export function NoUndoPanel({ job, panelRef }: AsidePanelProps) {
    return (
        <aside className="panel" aria-label="Sobre o backup" ref={panelRef}>
            <h2>Sobre o backup</h2>
            <p className="safe">
                <Icon name="shield" />
                Vídeos apagados não voltam para a playlist: o YouTube não deixa adicionar de novo. O backup em{' '}
                {job.backup} registra o que saiu.
            </p>
            {job.status !== 'running' && (
                <a className="btn btn-primary" href={href.playlists()}>
                    Voltar às playlists
                </a>
            )}
        </aside>
    );
}
