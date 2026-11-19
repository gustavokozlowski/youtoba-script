import { describe, expect, it } from 'vitest';
import { estimateRemovalQuota } from '../src/services/youtube/quota';

describe('estimateRemovalQuota', () => {
    it('playlist de 1.000 itens com 150 duplicados cabe em um dia', () => {
        expect(estimateRemovalQuota(1_000, 150, 10_000)).toEqual({
            listUnits: 20,
            deleteUnits: 7_500,
            total: 7_520,
            dailyLimit: 10_000,
            fitsInOneDay: true,
            maxDeletesPerDay: 199,
            daysNeeded: 1,
        });
    });

    it('com 300 duplicados precisa de 2 dias', () => {
        const estimate = estimateRemovalQuota(1_000, 300, 10_000);
        expect(estimate.fitsInOneDay).toBe(false);
        expect(estimate.daysNeeded).toBe(2);
    });

    it('sem duplicados só custa a leitura', () => {
        expect(estimateRemovalQuota(7, 0, 10_000)).toMatchObject({ listUnits: 1, deleteUnits: 0, daysNeeded: 0 });
    });
});
