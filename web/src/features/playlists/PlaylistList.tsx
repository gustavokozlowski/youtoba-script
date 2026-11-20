import { daysLabel, num } from '../../shared/lib/format';
import { href } from '../../shared/lib/route-links';
import { Icon } from '../../shared/ui/Icon';
import type { FitLabelProps, PlaylistListProps, PlaylistRowProps } from './PlaylistsScreen.types';

function fitLabel({ custoRemocao }: FitLabelProps, dailyLimit: number) {
    if (custoRemocao.cabeHoje) return { tone: 'ok', text: 'cabe hoje' };
    if (custoRemocao.unidades <= dailyLimit) return { tone: 'warn', text: 'cabe depois que a cota zerar' };
    return { tone: 'warn', text: daysLabel(Math.ceil(custoRemocao.unidades / dailyLimit)) };
}

function PlaylistRow({ playlist: p, dailyLimit }: PlaylistRowProps) {
    const fit = fitLabel(p, dailyLimit);
    const meta = [p.privacidade, p.indisponiveis > 0 && `${num(p.indisponiveis)} indisponíveis`].filter(Boolean);
    return (
        <li className="pl">
            {p.capa ? <img className="cover" src={p.capa} alt="" loading="lazy" /> : <span className="cover" />}
            <div className="pl-text">
                <div className="pl-title">
                    <a href={href.review(p.playlistId)}>{p.titulo}</a>
                </div>
                {meta.length > 0 && <div className="pl-meta">{meta.join(' · ')}</div>}
            </div>
            <div className="ba-wrap">
                <div className="ba">
                    <span className="from num">
                        <span className="sr-only">de </span>
                        {num(p.totalVideos)}
                    </span>
                    <span className="to num">
                        <span className="sr-only">para </span>
                        {num(p.aposRemocao)}
                    </span>
                    <small>vídeos</small>
                </div>
                <div className="bar" aria-hidden="true">
                    <i style={{ width: `${(p.aposRemocao / p.totalVideos) * 100}%` }} />
                    <b style={{ width: `${(p.duplicados / p.totalVideos) * 100}%` }} />
                </div>
            </div>
            <div className="dup num">
                {num(p.duplicados)}
                <span>repetidos · {String(p.percentualDuplicado).replace('.', ',')}%</span>
            </div>
            <div className="act">
                <div className="cost">
                    <b className="num">{num(p.custoRemocao.unidades)}</b> un.
                    <br />
                    <span className={`pill pill-${fit.tone}`}>{fit.text}</span>
                </div>
                <a className="btn btn-primary" href={href.review(p.playlistId)}>
                    Revisar<span className="sr-only"> {p.titulo}</span>
                </a>
            </div>
        </li>
    );
}

export function PlaylistList({ overview }: PlaylistListProps) {
    const { resumo, playlists, quotaHoje } = overview;
    const clean = resumo.playlistsAnalisadas + resumo.ignoradasComMenosDe2Itens - resumo.comDuplicados;
    if (playlists.length === 0) {
        return (
            <div className="empty">
                <h2>Tudo limpo</h2>
                <p>
                    Nenhuma das suas {num(resumo.playlistsAnalisadas + resumo.ignoradasComMenosDe2Itens)} playlists tem
                    vídeo repetido. Se adicionar vídeos depois, é só analisar de novo.
                </p>
            </div>
        );
    }
    return (
        <>
            <ul className="list">
                {playlists.map((p) => (
                    <PlaylistRow key={p.playlistId} playlist={p} dailyLimit={quotaHoje.limite} />
                ))}
            </ul>
            {clean > 0 && (
                <p className="aside-line">
                    <Icon name="check" />
                    {clean === 1 ? 'Outra playlist não tem' : `Outras ${num(clean)} playlists não têm`} vídeos
                    repetidos.
                </p>
            )}
        </>
    );
}
