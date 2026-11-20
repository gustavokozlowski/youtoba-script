import { useId, useMemo, useState } from 'react';
import type { TrackSearchListProps } from './ReviewScreen.types';

/** A busca por título ou canal na lista da revisão. */
export function useTrackFilter(items: TrackSearchListProps['items']) {
    const [query, setQuery] = useState('');
    const listLabel = useId();
    const visible = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase('pt-BR');
        if (!normalized) return items;
        return items.filter((item) =>
            `${item.titulo} ${item.canal ?? ''}`.toLocaleLowerCase('pt-BR').includes(normalized),
        );
    }, [items, query]);
    return { query, setQuery, listLabel, visible };
}
