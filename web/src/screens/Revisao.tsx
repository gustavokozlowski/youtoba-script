import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type RefObject, useId, useMemo, useRef, useState } from 'react';
import type { DuplicatesPreview } from '../api/api.types';
import type { ApiError } from '../api/client';
import { keys, usePreview, useStartRemoval } from '../api/queries';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { TrackRow } from '../components/TrackRow';
import { num, units } from '../lib/format';
import { findPlaylist } from '../lib/overview-cache';
import { href } from '../lib/router';

export function Revisao({ playlistId }: { playlistId: string }) {
    const known = findPlaylist(playlistId);
    const title = known?.titulo ?? playlistId;
    const client = useQueryClient();
    const { data: preview, error: loadError, refetch } = usePreview(playlistId);
    const [changed, setChanged] = useState(false);

    const confirmRef = useRef<HTMLInputElement>(null);
    // No celular o painel fica depois da lista inteira: o botão leva direto ao campo de confirmação.
    const goToConfirm = () => {
        confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        confirmRef.current?.focus({ preventScroll: true });
    };

    // Volta ao estado inicial (sem dados) para o painel e o número digitado recomeçarem do zero.
    const reloadAfterChange = () => {
        setChanged(true);
        void client.resetQueries({ queryKey: keys.preview(playlistId) });
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
            {loadError && <LoadError error={loadError} onRetry={() => void refetch()} />}
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
    const start = useStartRemoval(playlistId);
    const sending = start.isPending;
    const error = start.error && !handledHere(start.error) ? start.error : undefined;
    const confirmed = typed.trim() === String(n);
    const fitsAll = preview.cabemHoje >= n;
    const resetHour = preview.quotaHoje.zeraEmBrasilia.split(' ').at(-1);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!confirmed || sending) return;
        start.mutate(n, {
            onSuccess: (started) => {
                window.location.hash = href.removal(started.jobId);
            },
            onError: (e) => {
                if (e.code === 'already_running' && e.body?.jobId) window.location.hash = href.removal(e.body.jobId);
                else if (e.code === 'confirmation_required') onChanged();
            },
        });
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

/** Erros que a tela resolve sozinha (abre o job que já roda, ou relê a playlist que mudou). */
const handledHere = (e: ApiError) =>
    (e.code === 'already_running' && Boolean(e.body?.jobId)) || e.code === 'confirmation_required';

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
