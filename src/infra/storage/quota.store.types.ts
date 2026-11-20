export interface QuotaStore {
    /** Unidades gastas no dia (YYYY-MM-DD, horário do Pacífico). */
    get(day: string): number;
    add(day: string, units: number): void;
    set(day: string, units: number): void;
}

export interface ClosableQuotaStore extends QuotaStore {
    close(): void;
}

/** Linha da tabela quota_usage. */
export interface QuotaRow {
    units: number;
}
