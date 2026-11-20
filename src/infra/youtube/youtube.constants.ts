// A API devolve no máximo 50 itens por página.
export const PAGE_SIZE = 50;

// Custos da YouTube Data API v3: https://developers.google.com/youtube/v3/determine_quota_cost
export const QUOTA_COST = { list: 1, insert: 50, delete: 50, search: 100 } as const;

/** Custo em unidades de quota de uma chamada, pelo método HTTP e pelo recurso. */
export function requestCost(method: string | undefined, url: string | undefined): number {
    const resource = (url ?? '').replace(/^\/+/, '').split(/[/?]/)[0];
    if (resource === 'search') return QUOTA_COST.search;
    switch ((method ?? 'get').toLowerCase()) {
        case 'get':
            return QUOTA_COST.list;
        case 'delete':
            return QUOTA_COST.delete;
        default:
            return QUOTA_COST.insert;
    }
}
