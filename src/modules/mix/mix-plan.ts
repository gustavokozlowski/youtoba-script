import type { PlaylistEntry } from '../playlist/playlist.types';
import type { MixBucket, MixPlan } from './mix.types';

/**
 * Classifica uma entrada da origem. A primeira regra que casar vence:
 * 1. indisponível vem antes de tudo, para um vídeo apagado nunca contar como "adicionado";
 * 2. já está no destino (inclusive indisponível lá);
 * 3. já foi adicionado por uma entrada anterior da origem;
 * 4. senão, entra.
 */
function classify(entry: PlaylistEntry, targetIds: Set<string>, addedIds: Map<string, number>): MixBucket {
    if (entry.unavailable) {
        return 'unavailable';
    }
    if (targetIds.has(entry.videoId)) {
        return 'alreadyInTarget';
    }
    if (addedIds.has(entry.videoId)) {
        return 'repeatedInSource';
    }
    return 'toAdd';
}

/**
 * Decide quais vídeos da origem entram no fim do destino, sem criar duplicados. O(n).
 * Segue a convenção do projeto: a primeira ocorrência pela posição é a que fica.
 */
export function planMix(source: PlaylistEntry[], target: PlaylistEntry[]): MixPlan {
    const targetIds = new Set(target.map((entry) => entry.videoId));
    const firstPositionById = new Map<string, number>();
    const plan: MixPlan = { toAdd: [], skipped: { alreadyInTarget: [], repeatedInSource: [], unavailable: [] } };

    // Cópia antes de ordenar: as entradas de entrada nunca são alteradas.
    for (const entry of [...source].sort((a, b) => a.position - b.position)) {
        const bucket = classify(entry, targetIds, firstPositionById);
        if (bucket === 'toAdd') {
            firstPositionById.set(entry.videoId, entry.position);
            plan.toAdd.push(entry);
        } else if (bucket === 'repeatedInSource') {
            plan.skipped.repeatedInSource.push({
                ...entry,
                firstPosition: firstPositionById.get(entry.videoId) ?? entry.position,
            });
        } else {
            plan.skipped[bucket].push(entry);
        }
    }
    return plan;
}
