import { useQuota } from '../api/queries';
import logo from '../assets/logo.svg';
import { num } from '../lib/format';
import { href, type Route } from '../lib/router';

interface TopBarProps {
    route: Route;
    onSignOut: () => void;
    signingOut: boolean;
}

/** Hora em que a cota zera, no fuso de Brasília (o servidor manda "dd/mm/aaaa, hh:mm"). */
const resetTime = (zeraEmBrasilia: string) => zeraEmBrasilia.split(' ').at(-1);

export function TopBar({ route, onSignOut, signingOut }: TopBarProps) {
    const { data: quota } = useQuota();
    const section = route.name === 'remocao' || route.name === 'remocoes' ? 'remocoes' : 'playlists';
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
                    <a href={href.removals()} aria-current={section === 'remocoes' ? 'page' : undefined}>
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
                        <span className="q-reset">zera {resetTime(quota.zeraEmBrasilia)}</span>
                        <span className="sr-only">
                            de {num(quota.limite)} unidades, zera às {resetTime(quota.zeraEmBrasilia)}
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
