import type { QuotaSnapshot } from '../quota/quota.types';

/** Em qual lista de `GET /jobs` o tipo de job aparece. */
export type JobGroup = 'remocoes' | 'mixes';

/** Como cada tipo de job se mostra. Métodos (e não propriedades) deixam o formatador pedir o tipo específico. */
export interface JobKindSpec<J> {
    group: JobGroup;
    detail(job: J, quota: QuotaSnapshot): Record<string, unknown>;
    summary(job: J): Record<string, unknown>;
}
