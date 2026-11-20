import type { DuplicateItem, JobItemState } from '../api/api.types';
import { num, thumbnail } from '../lib/format';

interface TrackRowProps {
    item: DuplicateItem;
    /** Sem estado: linha da revisão (mostra a primeira ocorrência). Com estado: linha da remoção. */
    state?: JobItemState | 'agora';
    /** Acabou de ser apagado: o risco de spray é desenhado na hora. */
    fresh?: boolean;
}

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
            {state ? (
                <span className={`state state-${state}`}>{STATE_LABEL[state]}</span>
            ) : (
                <span className="first">
                    1ª vez em <b className="num">#{num(item.primeiraOcorrencia)}</b>
                </span>
            )}
            {state === 'apagado' && <SprayStrike seed={item.posicao} />}
        </>
    );
}

/** Variação estável por linha (a partir da posição), para o risco não parecer carimbo. */
const jitter = (seed: number, salt: number) => {
    const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
};

/** O risco de spray por cima do vídeo apagado. O filtro #spray fica uma vez na página (SprayFilter). */
function SprayStrike({ seed }: { seed: number }) {
    const start = 4 + jitter(seed, 1) * 18;
    const end = 480 + jitter(seed, 2) * 110;
    const y0 = 14 + jitter(seed, 3) * 6;
    const y1 = 7 + jitter(seed, 4) * 7;
    const mid = (start + end) / 2;
    // Corpo do traço e, no fim, a puxada curta de quem tira o dedo do spray.
    const d = `M${start} ${y0} C ${mid * 0.5} ${y0 - 6}, ${mid * 1.2} ${y1 + 9}, ${end} ${y1} q 12 -2 18 -7`;
    const tilt = -2.2 + jitter(seed, 5) * 2.4;
    return (
        <svg
            className="strike"
            viewBox="0 0 620 26"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
            style={{ rotate: `${tilt.toFixed(2)}deg` }}
        >
            <path className="overspray" d={d} />
            <path className="core" d={d} />
        </svg>
    );
}

export function SprayFilter() {
    return (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
            {/* biome-ignore lint/correctness/useUniqueElementIds: filtro único da página, o CSS aponta para url(#spray). */}
            <filter id="spray" x="-5%" y="-60%" width="110%" height="220%">
                <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
                <feGaussianBlur stdDeviation="0.5" />
            </filter>
            {/* biome-ignore lint/correctness/useUniqueElementIds: névoa do spray, única na página e usada pelo CSS. */}
            <filter id="overspray" x="-5%" y="-150%" width="110%" height="400%">
                <feGaussianBlur stdDeviation="3" />
            </filter>
            {/* biome-ignore lint/correctness/useUniqueElementIds: gradiente da máscara única da página. */}
            <linearGradient id="spray-taper-fade" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#fff" stopOpacity="0.15" />
                <stop offset="0.07" stopColor="#fff" stopOpacity="1" />
                <stop offset="0.9" stopColor="#fff" stopOpacity="1" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
            </linearGradient>
            {/* biome-ignore lint/correctness/useUniqueElementIds: máscara única da página, usada pelo CSS. */}
            <mask id="spray-taper" maskContentUnits="objectBoundingBox">
                <rect width="1" height="1" fill="url(#spray-taper-fade)" />
            </mask>
        </svg>
    );
}
