import { useCallback, useEffect, useState } from 'react';
import type { DuplicatesOverview, PlaylistSummary } from '../api/api.types';
import { ApiError, api } from '../api/client';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { daysLabel, num } from '../lib/format';
import { type CachedOverview, readOverview, saveOverview } from '../lib/overview-cache';
import { href } from '../lib/router';
import { announceQuotaChange } from '../lib/use-quota';

const savedAtLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(iso));

export function Playlists() {
    const [cached, setCached] = useState<CachedOverview | undefined>(readOverview);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ApiError>();

    const analyze = useCallback(async () => {
        setLoading(true);
        setError(undefined);
        try {
            const overview = await api.get<DuplicatesOverview>('/playlist/with-duplicates');
            saveOverview(overview);
            setCached(readOverview() ?? { overview, savedAt: new Date().toISOString() });
        } catch (e) {
            setError(e instanceof ApiError ? e : new ApiError(0, 'unknown', 'Algo deu errado na análise.'));
        } finally {
            setLoading(false);
            announceQuotaChange();
        }
    }, []);

    // Primeira visita nesta aba: analisa sozinho. Depois, só quando a pessoa pedir.
    useEffect(() => {
        if (!readOverview()) void analyze();
    }, [analyze]);

    const overview = cached?.overview;

    return (
        <main>
            <div className="head">
                <div>
                    <h1>Suas playlists</h1>
                    {overview ? (
                        <Summary overview={overview} />
                    ) : (
                        <p className="lead">
                            {loading
                                ? 'Procurando vídeos repetidos em todas as suas playlists…'
                                : 'Ainda não deu para analisar suas playlists.'}
                        </p>
                    )}
                </div>
                <div className="head-actions">
                    <button type="button" className="btn btn-ghost" onClick={analyze} disabled={loading}>
                        <Icon name="refresh" className={loading ? 'spin' : ''} />
                        {loading ? 'Analisando…' : overview ? 'Analisar de novo' : 'Analisar'}
                        {overview && !loading && <small>~{num(overview.resumo.custoDestaAnalise)} un.</small>}
                    </button>
                    {cached && <span className="stamp">Análise das {savedAtLabel(cached.savedAt)}</span>}
                </div>
            </div>

            {error && <AnalysisError error={error} onRetry={analyze} />}
            {overview?.resumo.aviso && (
                <Notice tone="warn" title="Lista incompleta">
                    {overview.resumo.aviso}
                </Notice>
            )}
            {overview && overview.resumo.falhas.length > 0 && (
                <Notice tone="warn" title="Algumas playlists não puderam ser lidas">
                    {overview.resumo.falhas.map((f) => f.titulo).join(', ')}.
                </Notice>
            )}

            {!overview && loading && <ListSkeleton />}
            {overview && <PlaylistList overview={overview} />}
        </main>
    );
}

function Summary({ overview: { resumo } }: { overview: DuplicatesOverview }) {
    return (
        <div className="summary">
            <div>
                <strong className="num">{num(resumo.comDuplicados)}</strong>
                <span>com repetidos</span>
            </div>
            <div>
                <strong className="num">{num(resumo.totalDuplicados)}</strong>
                <span>vídeos repetidos</span>
            </div>
            <div>
                <strong className="num">{num(resumo.custoTotalRemocao)}</strong>
                <span>unidades para limpar tudo</span>
            </div>
        </div>
    );
}

function PlaylistList({ overview }: { overview: DuplicatesOverview }) {
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

function fitLabel({ custoRemocao }: PlaylistSummary, dailyLimit: number) {
    if (custoRemocao.cabeHoje) return { tone: 'ok', text: 'cabe hoje' };
    if (custoRemocao.unidades <= dailyLimit) return { tone: 'warn', text: 'cabe depois que a cota zerar' };
    return { tone: 'warn', text: daysLabel(Math.ceil(custoRemocao.unidades / dailyLimit)) };
}

function PlaylistRow({ playlist: p, dailyLimit }: { playlist: PlaylistSummary; dailyLimit: number }) {
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

function AnalysisError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
    if (error.code === 'daily_budget_exhausted' || error.code === 'quota_exceeded') {
        return (
            <Notice tone="warn" title="Sem cota para analisar agora">
                {error.message}
            </Notice>
        );
    }
    return (
        <Notice
            tone="error"
            title="Não consegui analisar suas playlists"
            action={
                <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
                    Tentar de novo
                </button>
            }
        >
            {error.message}
        </Notice>
    );
}

function ListSkeleton() {
    return (
        <div className="list" aria-hidden="true">
            {[0, 1, 2].map((k) => (
                <div className="pl" key={k}>
                    <div className="cover skeleton" />
                    <div className="skeleton" style={{ height: 40 }} />
                    <div className="skeleton" style={{ height: 40 }} />
                    <div className="skeleton" style={{ height: 32 }} />
                    <div className="skeleton" style={{ height: 44 }} />
                </div>
            ))}
        </div>
    );
}
