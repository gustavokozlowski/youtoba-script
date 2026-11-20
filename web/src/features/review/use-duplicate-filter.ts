import { useId, useMemo, useState } from 'react';
import type { DuplicatesPreview } from '../../shared/api/api.types';

export function useDuplicateFilter(preview: DuplicatesPreview) {
    const [query, setQuery] = useState('');
    const listLabel = useId();
    const visible = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase('pt-BR');
        if (!normalized) return preview.itensDuplicados;
        return preview.itensDuplicados.filter((item) =>
            `${item.titulo} ${item.canal ?? ''}`.toLocaleLowerCase('pt-BR').includes(normalized),
        );
    }, [preview, query]);
    return { query, setQuery, listLabel, visible };
}
