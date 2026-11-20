import logo from '../assets/logo.svg';
import { useQuota } from '../shared/api/queries';
import { num, quotaResetTime } from '../shared/lib/format';
import { href } from '../shared/lib/route-links';
import type { TopBarProps } from './TopBar.types';

export function TopBar({ route, onSignOut, signingOut }: TopBarProps) {
    const { data: quota } = useQuota();
    const section = route.name === 'removal' || route.name === 'removals' ? 'removals' : 'playlists';
    const share = quota ? Math.max(0, Math.min(1, quota.restante / quota.limite)) : 1;

    return (
        <header className="top">
            <div className="top-in">
                <a className="brand" href={href.playlists()}>
                    <img src={logo} alt="youtoba, início" width="141" height="50" />
                </a>
                <nav className="nav" aria-label="Principal">
                    <a href={href.playlists()} aria-current={section === 'playlists' ? 'page' : undefined}>
                        Playlists
                    </a>
                    <a href={href.removals()} aria-current={section === 'removals' ? 'page' : undefined}>
                        Remoções
                    </a>
                </nav>
                {quota && (
                    <div className="quota" title="Cota da API do YouTube gasta por este app hoje">
                        <span className="q-label">Cota hoje</span>
                        <span className="q-short">Cota</span>
                        <strong className="num">{num(quota.restante)}</strong>
                        <span className={`meter${share < 0.1 ? ' low' : ''}`} aria-hidden="true">
                            <i style={{ width: `${share * 100}%` }} />
                        </span>
                        <span className="q-reset">zera {quotaResetTime(quota.zeraEmBrasilia)}</span>
                        <span className="sr-only">
                            de {num(quota.limite)} unidades, zera às {quotaResetTime(quota.zeraEmBrasilia)}
                        </span>
                    </div>
                )}
                <div className="acct">
                    <i className="dot" aria-hidden="true" />
                    <span className="acct-label">Conectado</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onSignOut} disabled={signingOut}>
                        {signingOut ? 'Saindo…' : 'Sair'}
                    </button>
                </div>
            </div>
        </header>
    );
}
