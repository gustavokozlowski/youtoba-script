import { num } from '../../shared/lib/format';
import { Icon } from '../../shared/ui/Icon';
import { TrackRow } from '../../shared/ui/TrackRow';
import type { TrackSearchListProps } from './ReviewScreen.types';
import { useTrackFilter } from './use-track-filter';

/** A lista de itens que saem, com busca e o atalho para a confirmação. Serve a repetidos e a apagados. */
export function TrackSearchList({ items, noun, heading, onGoToConfirm }: TrackSearchListProps) {
    const { query, setQuery, listLabel, visible } = useTrackFilter(items);
    return (
        <section>
            <div className="tools">
                <label className="search">
                    <Icon name="search" />
                    <span className="sr-only">Buscar nos {noun}</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por título ou canal"
                        autoComplete="off"
                    />
                </label>
                <button type="button" className="btn btn-primary to-confirm" onClick={onGoToConfirm}>
                    Confirmar remoção
                </button>
                <span className="count" aria-live="polite">
                    {query ? `${num(visible.length)} de ${num(items.length)} ${noun}` : `${num(items.length)} ${noun}`}
                </span>
            </div>
            <h2 className="sr-only" id={listLabel}>
                {heading}
            </h2>
            <ul className="tracks" aria-labelledby={listLabel}>
                {visible.map((item) => (
                    <TrackRow key={item.playlistItemId} item={item} />
                ))}
            </ul>
            {visible.length === 0 && (
                <p className="count">
                    Nada com “{query}” entre os {noun}.
                </p>
            )}
        </section>
    );
}
