import { formatMixJob, formatMixJobSummary } from '../mix/mix.formatter';
import type { MixJob } from '../mix/mix.types';
import { formatJob, formatJobSummary } from '../removal/removal.formatter';
import type { RemovalJob } from '../removal/removal.types';
import type { JobKindSpec } from './job-kinds.types';
import type { PlaylistJob } from './job-store.types';

const removalSpec: JobKindSpec<RemovalJob> = {
    group: 'remocoes',
    detail: formatJob,
    summary: formatJobSummary,
};
const mixSpec: JobKindSpec<MixJob> = {
    group: 'mixes',
    detail: formatMixJob,
    summary: formatMixJobSummary,
};

/** Tipo de job → formatador. Tipo novo entra aqui, sem `if` por tipo nos controllers. */
export const JOB_KINDS: Record<PlaylistJob['kind'], JobKindSpec<PlaylistJob>> = {
    duplicates: removalSpec,
    unavailable: removalSpec,
    mix: mixSpec,
};
