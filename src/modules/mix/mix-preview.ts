import { QUOTA_COST } from '../../infra/youtube/youtube.constants';
import type { PlaylistEntry } from '../playlist/playlist.types';
import type { QuotaSnapshot } from '../quota/quota.types';
import { estimateMixQuota } from '../quota/quota-estimate';
import type { MixIds, MixPreview, MixStartResult } from './mix.types';
import { planMix } from './mix-plan';

/** Dry-run puro: aplica o `planMix` às duas playlists lidas e mede custo e saldo, sem escrever nada. */
export function buildMixPreview(
    { sourceId, targetId }: MixIds,
    source: PlaylistEntry[],
    target: PlaylistEntry[],
    today: QuotaSnapshot,
): MixPreview {
    const plan = planMix(source, target);
    return {
        sourceId,
        targetId,
        sourceCount: source.length,
        targetCount: target.length,
        plan,
        quota: estimateMixQuota(source.length, target.length, plan.toAdd.length),
        quotaToday: today,
        fitToday: Math.min(plan.toAdd.length, Math.floor(today.remaining / QUOTA_COST.insert)),
    };
}

/** Antes de começar: nada a adicionar, confirmação diferente do número exato ou sem saldo para nenhum insert. */
export function startBlocker(preview: MixPreview, confirm: number | undefined): MixStartResult | undefined {
    const count = preview.plan.toAdd.length;
    if (count === 0) return { status: 'nothing_to_add', ...preview };
    if (confirm !== count) return { status: 'confirmation_required', ...preview };
    if (preview.fitToday === 0) return { status: 'budget_exhausted', quota: preview.quotaToday };
    return undefined;
}
