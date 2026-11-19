import { dbPath } from '../../utils/repository/db-path';
import { createSqliteQuotaStore } from '../../utils/repository/quota.store';
import type { QuotaStore } from '../../utils/repository/quota-store.types';
import { dailyQuotaLimit } from './quota';
import type { QuotaSnapshot } from './youtube.types';

// A quota da YouTube Data API zera à meia-noite no horário do Pacífico.
const PACIFIC = 'America/Los_Angeles';

const pacificParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: PACIFIC,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return { day: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
};

/** Dia da quota (YYYY-MM-DD no horário do Pacífico) em que `date` cai. */
export const pacificDay = (date: Date) => pacificParts(date).day;

/** Próxima meia-noite no horário do Pacífico, considerando horário de verão (UTC-7) ou não (UTC-8). */
export function nextPacificMidnight(date: Date): Date {
    const today = new Date(`${pacificDay(date)}T12:00:00Z`);
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    for (const offset of ['07', '08']) {
        const candidate = new Date(`${tomorrow}T${offset}:00:00Z`);
        if (pacificParts(candidate).time === '00:00') return candidate;
    }
    return new Date(`${tomorrow}T08:00:00Z`);
}

export class QuotaTracker {
    constructor(
        private readonly store: QuotaStore,
        private readonly dailyLimit: number = dailyQuotaLimit(),
        private readonly now: () => Date = () => new Date(),
    ) {}

    used(): number {
        return this.store.get(pacificDay(this.now()));
    }

    remaining(): number {
        return Math.max(0, this.dailyLimit - this.used());
    }

    canSpend(units: number): boolean {
        return this.remaining() >= units;
    }

    spend(units: number) {
        this.store.add(pacificDay(this.now()), units);
    }

    /** O Google respondeu quotaExceeded: o saldo de hoje acabou, mesmo que a conta local diga outra coisa. */
    markExhausted() {
        const day = pacificDay(this.now());
        this.store.set(day, Math.max(this.store.get(day), this.dailyLimit));
    }

    snapshot(): QuotaSnapshot {
        const now = this.now();
        return {
            day: pacificDay(now),
            used: this.used(),
            limit: this.dailyLimit,
            remaining: this.remaining(),
            resetsAt: nextPacificMidnight(now).toISOString(),
        };
    }
}

let instance: QuotaTracker | undefined;

export function quotaTracker(): QuotaTracker {
    if (!instance) {
        instance = new QuotaTracker(createSqliteQuotaStore(dbPath()));
    }
    return instance;
}
