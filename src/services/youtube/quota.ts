import { setting } from '../../config/settings';
import { PAGE_SIZE, QUOTA_COST } from '../../infra/youtube/youtube.constants';
import type { RemovalQuotaEstimate } from './youtube.types';

export const dailyQuotaLimit = () => setting('YOUTUBE_DAILY_QUOTA');

/** Estima o custo de ler a playlist e remover os duplicados, sem considerar o que já foi gasto hoje. */
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
