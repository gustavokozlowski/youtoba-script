import type { OneByOneAttempt, OneByOneOptions, OneByOneResult } from './one-by-one.types';

/**
 * Roda uma chamada por item, em série (a API responde 409 a alterações simultâneas na mesma playlist).
 * Antes de cada item confere a quota do dia (`canSpend`); para no saldo do dia ou no quotaExceeded do
 * Google e marca o resto como pulado.
 */
export async function runOneByOne(
    ids: string[],
    cost: number,
    attempt: OneByOneAttempt,
    { canSpend, onProgress }: OneByOneOptions = {},
): Promise<OneByOneResult> {
    const result: OneByOneResult = { succeeded: [], failed: [] };
    const skipFrom = (index: number, reason: string) => {
        result.failed.push(...ids.slice(index).map((id) => ({ id, reason })));
        return result;
    };

    for (const [index, itemId] of ids.entries()) {
        if (canSpend && !canSpend(cost)) return skipFrom(index, 'skipped_daily_budget');
        const failure = await attempt(itemId);
        const progress = { index, total: ids.length, itemId };
        if (!failure) {
            result.succeeded.push(itemId);
            onProgress?.({ ...progress, outcome: 'succeeded' });
            continue;
        }
        result.failed.push({ id: itemId, status: failure.status, reason: failure.reason });
        onProgress?.({ ...progress, outcome: 'failed', status: failure.status, reason: failure.reason });
        if (failure.reason === 'quotaExceeded') return skipFrom(index + 1, 'skipped_quota_exceeded');
    }
    return result;
}
