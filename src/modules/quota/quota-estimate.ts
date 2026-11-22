import { setting } from '../../config/settings';
import { PAGE_SIZE, QUOTA_COST } from '../../infra/youtube/youtube.constants';
import type { RemovalQuotaEstimate, WriteEstimateParams, WriteQuotaEstimate } from './quota.types';

export const dailyQuotaLimit = () => setting('YOUTUBE_DAILY_QUOTA');

/** Núcleo comum: leitura (1 unidade por página, ao menos uma por playlist) mais as escritas em série. */
export function estimateWrites({
    itemCounts,
    writeCount,
    writeCost,
    dailyLimit,
}: WriteEstimateParams): WriteQuotaEstimate {
    const listUnits = itemCounts.reduce(
        (sum, count) => sum + Math.max(1, Math.ceil(count / PAGE_SIZE)) * QUOTA_COST.list,
        0,
    );
    const writeUnits = writeCount * writeCost;
    const maxWritesPerDay = Math.max(0, Math.floor((dailyLimit - listUnits) / writeCost));

    return {
        listUnits,
        writeUnits,
        total: listUnits + writeUnits,
        dailyLimit,
        fitsInOneDay: listUnits + writeUnits <= dailyLimit,
        maxWritesPerDay,
        daysNeeded: writeCount === 0 ? 0 : Math.ceil(writeCount / Math.max(1, maxWritesPerDay)),
    };
}

/** Estima o custo de ler a playlist e remover os duplicados, sem considerar o que já foi gasto hoje. */
export function estimateRemovalQuota(
    itemCount: number,
    duplicateCount: number,
    dailyLimit = dailyQuotaLimit(),
): RemovalQuotaEstimate {
    const estimate = estimateWrites({
        itemCounts: [itemCount],
        writeCount: duplicateCount,
        writeCost: QUOTA_COST.delete,
        dailyLimit,
    });
    return {
        listUnits: estimate.listUnits,
        deleteUnits: estimate.writeUnits,
        total: estimate.total,
        dailyLimit,
        fitsInOneDay: estimate.fitsInOneDay,
        maxDeletesPerDay: estimate.maxWritesPerDay,
        daysNeeded: estimate.daysNeeded,
    };
}

/** Estima o custo de ler origem e destino e adicionar `addCount` vídeos ao destino. */
export function estimateMixQuota(
    sourceCount: number,
    targetCount: number,
    addCount: number,
    dailyLimit = dailyQuotaLimit(),
): WriteQuotaEstimate {
    return estimateWrites({
        itemCounts: [sourceCount, targetCount],
        writeCount: addCount,
        writeCost: QUOTA_COST.insert,
        dailyLimit,
    });
}
