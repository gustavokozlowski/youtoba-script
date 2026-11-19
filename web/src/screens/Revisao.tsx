import { type FormEvent, type RefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { DuplicatesPreview, RemovalStarted } from '../api/api.types';
import { ApiError, api } from '../api/client';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { TrackRow } from '../components/TrackRow';
import { num, units } from '../lib/format';
import { findPlaylist, markOverviewStale } from '../lib/overview-cache';
import { href } from '../lib/router';
import { announceQuotaChange } from '../lib/use-quota';

const asApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(0, 'unknown', 'Algo deu errado.'));

export function Revisao({ playlistId }: { playlistId: string }) {
    const known = findPlaylist(playlistId);
    const title = known?.titulo ?? playlistId;
    const [preview, setPreview] = useState<DuplicatesPreview>();
    const [loadError, setLoadError] = useState<ApiError>();
    const [changed, setChanged] = useState(false);

    const load = useCallback(async () => {
        setLoadError(undefined);
        try {
            setPreview(await api.get<DuplicatesPreview>(`/playlist/${encodeURIComponent(playlistId)}/duplicates`));
        } catch (e) {
            setLoadError(asApiError(e));
        } finally {
            announceQuotaChange();
        }
    }, [playlistId]);

    useEffect(() => {
        void load();
    }, [load]);

    const confirmRef = useRef<HTMLInputElement>(null);
    // No celular o painel fica depois da lista inteira: o botão leva direto ao campo de confirmação.
    const goToConfirm = () => {
        confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        confirmRef.current?.focus({ preventScroll: true });
    };

    const reloadAfterChange = () => {
        setChanged(true);
        setPreview(undefined);
        void load();
    };

    return (
        <main>
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
            {loadError && <LoadError error={loadError} onRetry={load} />}
            {preview && preview.duplicados === 0 && (
                <div className="empty">
                    <h2>Nada para tirar</h2>
                    <p>Nenhum vídeo repetido nesta playlist. Cada vídeo aparece uma vez só.</p>
                    <a className="btn btn-ghost" href={href.playlists()}>
                        <Icon name="back" />
                        Voltar às playlists
                    </a>
                </div>
            )}
            {preview && preview.duplicados > 0 && (
                <div className="cols">
                    <DuplicateList preview={preview} onGoToConfirm={goToConfirm} />
                    <RemovePanel
                        preview={preview}
                        playlistId={playlistId}
                        onChanged={reloadAfterChange}
                        confirmRef={confirmRef}
                    />
                </div>
            )}
        </main>
    );
}

function Trio({ preview }: { preview: DuplicatesPreview }) {
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

function DuplicateList({ preview, onGoToConfirm }: { preview: DuplicatesPreview; onGoToConfirm: () => void }) {
    const [query, setQuery] = useState('');
    const listLabel = useId();
    const visible = useMemo(() => {
        const q = query.trim().toLocaleLowerCase('pt-BR');
        if (!q) return preview.itensDuplicados;
        return preview.itensDuplicados.filter((item) =>
            `${item.titulo} ${item.canal ?? ''}`.toLocaleLowerCase('pt-BR').includes(q),
        );
    }, [preview, query]);

    return (
        <section>
            <div className="tools">
                <label className="search">
                    <Icon name="search" />
                    <span className="sr-only">Buscar nos repetidos</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar por título ou canal"
                        autoComplete="off"
                    />
                </label>
                <button type="button" className="btn btn-primary to-confirm" onClick={onGoToConfirm}>
                    Confirmar remoção
                </button>
                <span className="count" aria-live="polite">
                    {query
                        ? `${num(visible.length)} de ${num(preview.duplicados)} repetidos`
                        : `${num(preview.duplicados)} repetidos`}
                </span>
            </div>
            <h2 className="sr-only" id={listLabel}>
                Repetidos que saem
            </h2>
            <ul className="tracks" aria-labelledby={listLabel}>
                {visible.map((item) => (
                    <TrackRow key={item.playlistItemId} item={item} />
                ))}
            </ul>
            {visible.length === 0 && <p className="count">Nenhum repetido com “{query}”.</p>}
        </section>
    );
}

function RemovePanel({
    preview,
    playlistId,
    onChanged,
    confirmRef,
}: {
    preview: DuplicatesPreview;
    playlistId: string;
    onChanged: () => void;
    confirmRef: RefObject<HTMLInputElement | null>;
}) {
    const n = preview.duplicados;
    const inputId = useId();
    const hintId = useId();
    const [typed, setTyped] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<ApiError>();
    const confirmed = typed.trim() === String(n);
    const fitsAll = preview.cabemHoje >= n;
    const resetHour = preview.quotaHoje.zeraEmBrasilia.split(' ').at(-1);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!confirmed || sending) return;
        setSending(true);
        setError(undefined);
        try {
            const started = await api.send<RemovalStarted>(
                'DELETE',
                `/playlist/${encodeURIComponent(playlistId)}/remove-duplicates?confirm=${n}`,
            );
            markOverviewStale();
            window.location.hash = href.removal(started.jobId);
        } catch (e) {
            const apiError = asApiError(e);
            if (apiError.code === 'already_running' && apiError.body?.jobId) {
                window.location.hash = href.removal(apiError.body.jobId);
            } else if (apiError.code === 'confirmation_required') {
                onChanged();
            } else {
                setError(apiError);
            }
        } finally {
            setSending(false);
            announceQuotaChange();
        }
    };

    return (
        <aside className="panel" aria-label="Remover repetidos">
            <h2>Remover repetidos</h2>
            <dl>
                <div>
                    <dt>Custo</dt>
                    <dd className="num">{units(preview.quota.unidadesRemocao)}</dd>
                </div>
                <div>
                    <dt>Saldo de hoje</dt>
                    <dd className="num">{units(preview.quotaHoje.restante)}</dd>
                </div>
                <div>
                    <dt>Cabe hoje</dt>
                    <dd className={fitsAll ? 'yes' : 'partial'}>
                        {fitsAll
                            ? `Sim, os ${num(n)}`
                            : preview.cabemHoje === 0
                              ? 'Nenhum'
                              : `${num(preview.cabemHoje)} de ${num(n)}`}
                    </dd>
                </div>
            </dl>
            {!fitsAll && (
                <p className="panel-note">
                    O resto fica para depois que a cota zerar ({resetHour}). É só rodar de novo: continua de onde parou.
                </p>
            )}
            <hr />
            <p className="safe">
                <Icon name="shield" />
                Antes de apagar, a playlist inteira vai para a pasta backups/. Dá para desfazer.
            </p>
            {error && (
                <Notice tone={error.code === 'daily_budget_exhausted' ? 'warn' : 'error'} title="A remoção não começou">
                    {error.message}
                </Notice>
            )}
            <form className="confirm" onSubmit={submit}>
                <label htmlFor={inputId}>Digite {num(n)} para confirmar</label>
                <input
                    ref={confirmRef}
                    id={inputId}
                    inputMode="numeric"
                    autoComplete="off"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    aria-describedby={hintId}
                    placeholder={String(n)}
                />
                <p className="hint" id={hintId}>
                    É o número exato de vídeos que vão sair.
                </p>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!confirmed || sending || preview.cabemHoje === 0}
                >
                    {sending ? 'Começando…' : `Remover ${num(n)} repetidos`}
                </button>
            </form>
        </aside>
    );
}

function LoadError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
    if (error.code === 'playlist_not_found') {
        return (
            <Notice tone="error" title="Playlist não encontrada">
                Ela pode ter sido apagada ou ficado inacessível para esta conta.
            </Notice>
        );
    }
    const quota = error.code === 'quota_exceeded';
    return (
        <Notice
            tone={quota ? 'warn' : 'error'}
            title={quota ? 'Sem cota para ler a playlist agora' : 'Não consegui ler a playlist'}
            action={
                quota ? undefined : (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
                        Tentar de novo
                    </button>
                )
            }
        >
            {error.message}
        </Notice>
    );
}
