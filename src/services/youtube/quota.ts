import { PAGE_SIZE } from './client/youtube.client';

// Custos da YouTube Data API v3: https://developers.google.com/youtube/v3/determine_quota_cost
export const QUOTA_COST = { list: 1, delete: 50, insert: 50 } as const;

export const dailyQuotaLimit = () => Number(process.env.YOUTUBE_DAILY_QUOTA ?? 10_000);

export interface RemovalQuotaEstimate {
    listUnits: number;
    deleteUnits: number;
    total: number;
    dailyLimit: number;
    fitsInOneDay: boolean;
    maxDeletesPerDay: number;
    daysNeeded: number;
}

/** Estima o custo de ler a playlist e remover os duplicados. Não sabe quanto da quota de hoje já foi gasto. */
export function estimateRemovalQuota(
    itemCount: number,
    duplicateCount: number,
    dailyLimit = dailyQuotaLimit(),
): RemovalQuotaEstimate {
    const listUnits = Math.max(1, Math.ceil(itemCount / PAGE_SIZE)) * QUOTA_COST.list;
    const deleteUnits = duplicateCount * QUOTA_COST.delete;
    const maxDeletesPerDay = Math.max(0, Math.floor((dailyLimit - listUnits) / QUOTA_COST.delete));

    return {
        listUnits,
        deleteUnits,
        total: listUnits + deleteUnits,
        dailyLimit,
        fitsInOneDay: listUnits + deleteUnits <= dailyLimit,
        maxDeletesPerDay,
        daysNeeded: duplicateCount === 0 ? 0 : Math.ceil(duplicateCount / Math.max(1, maxDeletesPerDay)),
    };
}
