import { useCallback, useEffect, useState } from 'react';
import type { QuotaSnapshot } from '../api/api.types';
import { api } from '../api/client';

/** Pedido para a barra de topo reler a cota (depois de uma análise ou remoção). */
export const QUOTA_CHANGED_EVENT = 'youtoba:quota-changed';
export const announceQuotaChange = () => window.dispatchEvent(new Event(QUOTA_CHANGED_EVENT));

// GET /quota é local (não chama o YouTube), então dá para reler com frequência.
const REFRESH_MS = 15_000;

export function useQuota() {
    const [quota, setQuota] = useState<QuotaSnapshot>();
    const refresh = useCallback(() => {
        api.get<QuotaSnapshot>('/quota')
            .then(setQuota)
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        refresh();
        const timer = window.setInterval(refresh, REFRESH_MS);
        window.addEventListener(QUOTA_CHANGED_EVENT, refresh);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener(QUOTA_CHANGED_EVENT, refresh);
        };
    }, [refresh]);

    return quota;
}
