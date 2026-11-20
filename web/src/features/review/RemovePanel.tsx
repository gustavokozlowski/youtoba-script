import { num, quotaResetTime, units } from '../../shared/lib/format';
import { Icon } from '../../shared/ui/Icon';
import { Notice } from '../../shared/ui/Notice';
import type { RemovePanelProps } from './ReviewScreen.types';
import { useReviewConfirmation } from './use-review-confirmation';

export function RemovePanel({ preview, playlistId, onChanged, confirmRef }: RemovePanelProps) {
    const { n, inputId, hintId, typed, setTyped, confirmed, sending, error, submit } = useReviewConfirmation(
        preview,
        playlistId,
        onChanged,
    );
    const fitsAll = preview.cabemHoje >= n;
    const resetHour = quotaResetTime(preview.quotaHoje.zeraEmBrasilia);

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
                    onChange={(event) => setTyped(event.target.value)}
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
