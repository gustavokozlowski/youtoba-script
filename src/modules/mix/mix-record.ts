import fs from 'node:fs';
import type { JobFailure } from '../jobs/job.types';
import type { PlaylistEntry } from '../playlist/playlist.types';
import { createRecordFile } from '../removal/backup';
import type { MixAddedVideo, MixRecord } from './mix.types';

/** Grava o registro do Mix antes do primeiro insert (`mix-<destino>-<data>.json`, só do dono, sem sobrescrever). */
export function writeMixRecord(sourceId: string, targetId: string, planned: PlaylistEntry[], now = new Date()): string {
    const record: MixRecord = {
        version: 1,
        kind: 'mix',
        sourceId,
        targetId,
        createdAt: now.toISOString(),
        planned,
        added: [],
        failed: [],
    };
    return createRecordFile(`mix-${targetId}`, record, now);
}

export function readMixRecord(file: string): MixRecord {
    const record = JSON.parse(fs.readFileSync(file, 'utf8')) as MixRecord;
    const valid =
        record.version === 1 &&
        record.kind === 'mix' &&
        typeof record.targetId === 'string' &&
        Array.isArray(record.added) &&
        Array.isArray(record.planned);
    if (!valid) throw new Error(`Registro de Mix inválido: ${file}`);
    return record;
}

/** Atualiza o que já entrou. Chamado a cada item, para o arquivo valer mesmo se o processo cair. */
export function recordMix(
    file: string,
    result: { added: MixAddedVideo[]; failed: JobFailure[] },
    { finished }: { finished: boolean },
    now = new Date(),
) {
    const record: MixRecord = {
        ...readMixRecord(file),
        added: result.added,
        failed: result.failed,
        updatedAt: now.toISOString(),
        ...(finished ? { finishedAt: now.toISOString() } : {}),
    };
    fs.writeFileSync(file, JSON.stringify(record, null, 2));
}
