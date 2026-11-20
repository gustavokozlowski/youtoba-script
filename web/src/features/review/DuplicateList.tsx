import { num } from '../../shared/lib/format';
import { Icon } from '../../shared/ui/Icon';
import { TrackRow } from '../../shared/ui/TrackRow';
import type { DuplicateListProps } from './ReviewScreen.types';
import { useDuplicateFilter } from './use-duplicate-filter';

export function DuplicateList({ preview, onGoToConfirm }: DuplicateListProps) {
    const { query, setQuery, listLabel, visible } = useDuplicateFilter(preview);
    return (
        <section>
            <div className="tools">
                <label className="search">
                    <Icon name="search" />
                    <span className="sr-only">Buscar nos repetidos</span>
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
