import { AnimatePresence, LazyMotion, MotionConfig, m, useReducedMotion } from 'motion/react';
import { TrackRowContent, trackClassName } from '../../shared/ui/TrackRow';
import type { LiveTracksProps } from './LiveTracks.types';

const loadFeatures = () => import('../../shared/lib/motion-features').then((mod) => mod.default);

// Desaceleração natural: a linha chega rápido e assenta. A saída é mais curta que a entrada.
const EASE = [0.16, 1, 0.3, 1] as const;
const enter = { opacity: 0, y: 14 };
const shown = { opacity: 1, y: 0 };
const leave = { opacity: 0, y: -14, transition: { duration: 0.25, ease: EASE } };
const settle = { duration: 0.4, ease: EASE };

/**
 * A lista da remoção ao vivo. Quando a janela avança, o apagado do topo sai subindo, as outras
 * linhas sobem para o lugar dele (FLIP, só transform) e o próximo da fila entra por baixo.
 * Com reduced-motion, nada se desloca: quem entra só aparece em fade, e quem sai some na hora
 * (um fade de saída ficaria por cima da linha que já subiu para o lugar dele).
 */
export function LiveTracks({ rows, current, fresh, moving }: LiveTracksProps) {
    const reduced = useReducedMotion();
    return (
        <LazyMotion features={loadFeatures} strict>
            <MotionConfig reducedMotion="user" transition={settle}>
                <ul className="tracks" aria-label="Itens da remoção">
                    <AnimatePresence initial={false} mode="popLayout">
                        {rows.map((item) => {
                            const state = item === current ? 'agora' : item.estado;
                            return (
                                <m.li
                                    key={item.playlistItemId}
                                    layout={moving ? 'position' : false}
                                    className={trackClassName(state, fresh.has(item.playlistItemId))}
                                    initial={moving ? enter : false}
                                    animate={shown}
                                    exit={reduced ? undefined : leave}
                                >
                                    <TrackRowContent item={item} state={state} />
                                </m.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            </MotionConfig>
        </LazyMotion>
    );
}
