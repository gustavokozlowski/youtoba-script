import { num, quotaResetTime, units } from '../../shared/lib/format';
import { Notice } from '../../shared/ui/Notice';
import { fitToday } from './fit-today';
import type { ConfirmRemovalPanelProps } from './ReviewScreen.types';

/**
 * O painel de confirmação: custo, saldo, "cabe hoje" e o campo em que se digita o número.
 * O que muda de um tipo de remoção para outro entra por `heading`, `submitLabel` e `safety`.
 */
export function ConfirmRemovalPanel({
    heading,
    quota,
    quotaHoje,
    cabemHoje,
    confirmation,
    submitLabel,
    safety,
    confirmRef,
}: ConfirmRemovalPanelProps) {
    const { n, inputId, hintId, typed, setTyped, confirmed, sending, error, submit } = confirmation;
    const fit = fitToday(cabemHoje, n);

    return (
        <aside className="panel" aria-label={heading}>
            <h2>{heading}</h2>
            <dl>
                <div>
                    <dt>Custo</dt>
                    <dd className="num">{units(quota.unidadesRemocao)}</dd>
                </div>
                <div>
                    <dt>Saldo de hoje</dt>
                    <dd className="num">{units(quotaHoje.restante)}</dd>
                </div>
                <div>
                    <dt>Cabe hoje</dt>
                    <dd className={fit.tone}>{fit.text}</dd>
                </div>
            </dl>
            {cabemHoje < n && (
                <p className="panel-note">
                    O resto fica para depois que a cota zerar ({quotaResetTime(quotaHoje.zeraEmBrasilia)}). É só rodar
                    de novo: continua de onde parou.
                </p>
            )}
            <hr />
            {safety}
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
                    className={confirmed ? 'is-confirmed' : undefined}
                />
                <p className="hint" id={hintId}>
                    É o número exato de vídeos que vão sair.
                </p>
                <button type="submit" className="btn btn-primary" disabled={!confirmed || sending || cabemHoje === 0}>
                    {sending ? 'Começando…' : submitLabel}
                </button>
            </form>
        </aside>
    );
}
