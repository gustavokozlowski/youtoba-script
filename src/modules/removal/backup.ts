import fs from 'node:fs';
import path from 'node:path';
import { setting } from '../../config/settings';
import type { DeleteItemsResult } from '../../infra/youtube/youtube-api.types';
import type { PlaylistBackup, PlaylistEntry } from '../playlist/playlist.types';

export const backupDir = () => setting('BACKUP_DIR');

/** Grava a playlist inteira antes de qualquer remoção. O YouTube não tem lixeira. */
export function writeBackup(playlistId: string, items: PlaylistEntry[], now = new Date()): string {
    const dir = backupDir();
    fs.mkdirSync(dir, { recursive: true });

    const safeId = playlistId.replace(/[^A-Za-z0-9_-]/g, '_');
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const file = path.join(dir, `${safeId}-${stamp}.json`);

    const backup: PlaylistBackup = {
        version: 1,
        playlistId,
        createdAt: now.toISOString(),
        itemCount: items.length,
        items,
    };
    fs.writeFileSync(file, JSON.stringify(backup, null, 2), { mode: 0o600, flag: 'wx' });
    return file;
}

/** Registra no backup o que já foi removido. Chamado a cada item, para o arquivo valer mesmo se o processo cair. */
export function recordRemoval(
    file: string,
    result: DeleteItemsResult,
    { finished }: { finished: boolean },
    now = new Date(),
) {
    const backup = readBackup(file);
    backup.removal = {
        removed: result.removed,
        failed: result.failed,
        updatedAt: now.toISOString(),
        ...(finished ? { finishedAt: now.toISOString() } : {}),
    };
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
}

export function readBackup(file: string): PlaylistBackup {
    const backup = JSON.parse(fs.readFileSync(file, 'utf8')) as PlaylistBackup;
    if (backup.version !== 1 || !Array.isArray(backup.items) || typeof backup.playlistId !== 'string') {
        throw new Error(`Arquivo de backup inválido: ${file}`);
    }
    return backup;
}
