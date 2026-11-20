import { useState } from 'react';
import type { RemovalJob } from '../../shared/api/api.types';

const removedIds = (job: RemovalJob) =>
    new Set(job.itens.filter((item) => item.estado === 'apagado').map((item) => item.playlistItemId));

export function useNewlyRemoved(job: RemovalJob | undefined) {
    const [previous, setPrevious] = useState(job);
    const [fresh, setFresh] = useState<Set<string>>(() => new Set());
    if (job !== previous) {
        setPrevious(job);
        const before = previous ? removedIds(previous) : undefined;
        setFresh(job && before ? new Set([...removedIds(job)].filter((id) => !before.has(id))) : new Set());
    }
    return fresh;
}
