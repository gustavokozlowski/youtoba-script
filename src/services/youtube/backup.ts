import fs from 'node:fs';
import path from 'node:path';
import type { DeleteItemsResult } from './client/youtube.client';
import type { PlaylistEntry } from './duplicates';

export interface PlaylistBackup {
    version: 1;
    playlistId: string;
    createdAt: string;
    itemCount: number;
    items: PlaylistEntry[];
    removal?: DeleteItemsResult & { finishedAt: string };
}

export const backupDir = () => process.env.BACKUP_DIR ?? 'backups';

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

export function recordRemoval(file: string, result: DeleteItemsResult, now = new Date()) {
    const backup = readBackup(file);
    backup.removal = { ...result, finishedAt: now.toISOString() };
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
}

export function readBackup(file: string): PlaylistBackup {
    const backup = JSON.parse(fs.readFileSync(file, 'utf8')) as PlaylistBackup;
    if (backup.version !== 1 || !Array.isArray(backup.items) || typeof backup.playlistId !== 'string') {
        throw new Error(`Arquivo de backup inválido: ${file}`);
    }
    return backup;
}
