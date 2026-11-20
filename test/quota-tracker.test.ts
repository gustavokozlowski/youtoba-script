import { describe, expect, it } from 'vitest';
import type { QuotaStore } from '../src/infra/storage/quota.store.types';
import { nextPacificMidnight, pacificDay, QuotaTracker } from '../src/services/youtube/quota-tracker';

const memoryStore = (): QuotaStore => {
    const days = new Map<string, number>();
    return {
        get: (day) => days.get(day) ?? 0,
        add: (day, units) => days.set(day, (days.get(day) ?? 0) + units),
        set: (day, units) => days.set(day, units),
    };
};

describe('dia da quota (horário do Pacífico)', () => {
    it('no inverno (UTC-8), o dia vira às 08:00 UTC', () => {
        expect(pacificDay(new Date('2026-11-19T07:59:00Z'))).toBe('2026-11-18');
        expect(pacificDay(new Date('2026-11-19T08:00:00Z'))).toBe('2026-11-19');
        expect(nextPacificMidnight(new Date('2026-11-19T10:17:00Z')).toISOString()).toBe('2026-11-20T08:00:00.000Z');
    });

    it('no verão (UTC-7), o dia vira às 07:00 UTC', () => {
        expect(pacificDay(new Date('2026-07-10T06:59:00Z'))).toBe('2026-07-09');
        expect(pacificDay(new Date('2026-07-10T07:00:00Z'))).toBe('2026-07-10');
        expect(nextPacificMidnight(new Date('2026-07-10T12:00:00Z')).toISOString()).toBe('2026-07-11T07:00:00.000Z');
    });

    it('na noite em que o horário de verão acaba, a próxima meia-noite já é UTC-8', () => {
        expect(nextPacificMidnight(new Date('2026-10-31T20:00:00Z')).toISOString()).toBe('2026-11-01T07:00:00.000Z');
        expect(nextPacificMidnight(new Date('2026-11-01T12:00:00Z')).toISOString()).toBe('2026-11-02T08:00:00.000Z');
    });
});

describe('QuotaTracker', () => {
    it('soma o gasto do dia e calcula o saldo', () => {
        const now = new Date('2026-11-19T12:00:00Z');
        const tracker = new QuotaTracker(memoryStore(), 10_000, () => now);
        tracker.spend(20);
        tracker.spend(50);
        expect(tracker.used()).toBe(70);
        expect(tracker.remaining()).toBe(9_930);
        expect(tracker.canSpend(9_930)).toBe(true);
        expect(tracker.canSpend(9_931)).toBe(false);
    });

    it('zera quando muda o dia no Pacífico', () => {
        const store = memoryStore();
        let now = new Date('2026-11-20T07:30:00Z');
        const tracker = new QuotaTracker(store, 10_000, () => now);
        tracker.spend(9_000);
        now = new Date('2026-11-20T08:00:00Z');
        expect(tracker.used()).toBe(0);
        expect(tracker.remaining()).toBe(10_000);
    });

    it('quotaExceeded do Google zera o saldo, mesmo que a conta local diga outra coisa', () => {
        const now = new Date('2026-11-19T12:00:00Z');
        const tracker = new QuotaTracker(memoryStore(), 10_000, () => now);
        tracker.spend(3_000);
        tracker.markExhausted();
        expect(tracker.remaining()).toBe(0);
        expect(tracker.snapshot()).toMatchObject({ day: '2026-11-19', used: 10_000, remaining: 0 });
    });

    it('o saldo nunca fica negativo', () => {
        const now = new Date('2026-11-19T12:00:00Z');
        const tracker = new QuotaTracker(memoryStore(), 100, () => now);
        tracker.spend(150);
        expect(tracker.remaining()).toBe(0);
    });
});
