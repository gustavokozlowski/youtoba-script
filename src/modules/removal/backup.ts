import fs from 'node:fs';
import path from 'node:path';
import { setting } from '../../config/settings';
import type { DeleteItemsResult } from '../../infra/youtube/youtube-api.types';
import type { PlaylistEntry } from '../playlist/playlist.types';
import type { PlaylistBackup } from './removal.types';

export const backupDir = () => setting('BACKUP_DIR');

/** Nome aceito para um backup de remoção. */
export const BACKUP_NAME = /^[A-Za-z0-9_-]+\.json$/;

/**
 * Caminho de um arquivo de BACKUP_DIR a partir do nome vindo da requisição, ou `undefined` se o nome
 * não bate com o padrão ou se, depois do `path.resolve`, o arquivo sai do diretório.
 */
export function resolveRecordFile(name: string, pattern: RegExp): string | undefined {
    if (!pattern.test(name)) return undefined;
    const directory = `${path.resolve(backupDir())}${path.sep}`;
    const file = path.resolve(backupDir(), name);
    return file.startsWith(directory) ? file : undefined;
}

/**
 * Cria um arquivo novo em BACKUP_DIR (`<label>-<data>.json`), só do dono (0o600) e sem sobrescrever
 * nenhum existente (flag 'wx'). Usado pelo backup da remoção e pelo registro do Mix.
 */
export function createRecordFile(label: string, content: object, now = new Date()): string {
    const dir = backupDir();
    fs.mkdirSync(dir, { recursive: true });

    const safeLabel = label.replace(/[^A-Za-z0-9_-]/g, '_');
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const file = path.join(dir, `${safeLabel}-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(content, null, 2), { mode: 0o600, flag: 'wx' });
    return file;
}

/** Grava a playlist inteira antes de qualquer remoção. O YouTube não tem lixeira. */
export function writeBackup(playlistId: string, items: PlaylistEntry[], now = new Date()): string {
    const backup: PlaylistBackup = {
        version: 1,
        playlistId,
        createdAt: now.toISOString(),
        itemCount: items.length,
        items,
    };
    return createRecordFile(playlistId, backup, now);
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
