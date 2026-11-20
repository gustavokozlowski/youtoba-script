import { num, thumbnail } from '../lib/format';
import type { TrackRowProps, TrackTailProps } from './TrackRow.types';

const STATE_LABEL = { apagado: 'apagado', falhou: 'falhou', pendente: 'na fila', agora: 'agora' } as const;

/** A linha pronta, num `<li>`. Quem precisa de outro contêiner (a lista animada da remoção) usa as peças abaixo. */
export function TrackRow({ item, state, fresh = false }: TrackRowProps) {
    return (
        <li className={trackClassName(state, fresh)}>
            <TrackRowContent item={item} state={state} />
        </li>
    );
}

export const trackClassName = (state: TrackRowProps['state'], fresh = false) =>
    `track${state === 'apagado' ? ' gone' : ''}${fresh ? ' fresh' : ''}`;

export function TrackRowContent({ item, state }: Omit<TrackRowProps, 'fresh'>) {
    return (
        <>
            <span className="pos num">#{num(item.posicao)}</span>
            <img className="thumb" src={thumbnail(item.videoId)} alt="" loading="lazy" width="96" height="54" />
            <div className="track-text">
                <div className="track-title">{item.titulo}</div>
                {item.canal && <div className="track-channel">{item.canal}</div>}
            </div>
            <TrackTail item={item} state={state} />
            {state === 'apagado' && <BuffMark />}
        </>
    );
}

/** O fim da linha: o estado na remoção; na revisão, a primeira ocorrência (só o repetido tem). */
function TrackTail({ item, state }: TrackTailProps) {
    if (state) return <span className={`state state-${state}`}>{STATE_LABEL[state]}</span>;
    if (item.primeiraOcorrencia === undefined) return null;
    return (
        <span className="first">
            1ª vez em <b className="num">#{num(item.primeiraOcorrencia)}</b>
        </span>
    );
}

/** A tinta cinza por cima do vídeo apagado; só decoração, o estado já está no rótulo. */
function BuffMark() {
    return <span className="buff" aria-hidden="true" />;
}
