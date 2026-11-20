import { QUOTA_COST } from '../../infra/youtube/youtube.constants';
import type { QuotaSnapshot, RemovalQuotaEstimate } from './quota.types';

/** Data e hora no horário de Brasília, como a pessoa lê (a cota zera à meia-noite do Pacífico). */
export const brasiliaDateTime = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(iso),
    );

export const formatEstimate = (quota: RemovalQuotaEstimate) => ({
    unidadesLeitura: quota.listUnits,
    unidadesRemocao: quota.deleteUnits,
    total: quota.total,
    limiteDiario: quota.dailyLimit,
    cabeEmUmDia: quota.fitsInOneDay,
    maxRemocoesPorDia: quota.maxDeletesPerDay,
    diasNecessarios: quota.daysNeeded,
});

export const formatQuotaSnapshot = (quota: QuotaSnapshot) => ({
    dia: quota.day,
    usado: quota.used,
    limite: quota.limit,
    restante: quota.remaining,
    remocoesPossiveis: Math.floor(quota.remaining / QUOTA_COST.delete),
    zeraEm: quota.resetsAt,
    zeraEmBrasilia: brasiliaDateTime(quota.resetsAt),
    observacao:
        'Conta só o que este projeto gastou por aqui. Outros usos do mesmo projeto no Google Cloud não aparecem.',
});
