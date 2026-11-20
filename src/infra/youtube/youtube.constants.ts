// A API devolve no máximo 50 itens por página.
export const PAGE_SIZE = 50;

// Custos da YouTube Data API v3: https://developers.google.com/youtube/v3/determine_quota_cost
export const QUOTA_COST = { list: 1, insert: 50, delete: 50, search: 100 } as const;
