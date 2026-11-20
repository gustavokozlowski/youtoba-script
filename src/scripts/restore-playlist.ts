require('dotenv').config();

import { connectedClient } from '../modules/quota/tracked-client';
import { readBackup } from '../modules/removal/backup';
import { restoreRemoved } from '../modules/removal/restore';
import { errorMessage } from '../shared/errors';

// Uso: npm run restore:playlist -- backups/<arquivo>.json
async function main() {
    const file = process.argv[2];
    if (!file) {
        console.error('Uso: npm run restore:playlist -- backups/<arquivo>.json');
        process.exit(1);
    }

    const backup = readBackup(file);
    const removed = backup.removal?.removed.length ?? 0;
    console.log(
        `Backup de ${backup.playlistId} (${backup.itemCount} itens, ${removed} removidos em ${backup.removal?.finishedAt ?? '-'})`,
    );

    if (removed === 0) {
        console.log('Esse backup não registra nenhuma remoção. Nada a restaurar.');
        return;
    }

    const client = await connectedClient();
    if (!client) {
        console.error(
            'Conta não conectada. Abra http://localhost:3000/auth/login com o servidor rodando e tente de novo.',
        );
        process.exit(1);
    }

    const result = await restoreRemoved(client, backup);
    console.log(
        `Restaurados: ${result.restored.length} (fora da posição original: ${result.restored.filter((r) => !r.atOriginalPosition).length})`,
    );
    console.log(`Já estavam na playlist: ${result.skipped.length}`);
    console.log(`Falhas: ${result.failed.length}`);
    for (const failure of result.failed) {
        console.log(
            `  posição ${failure.position} (${failure.videoId}): HTTP ${failure.status ?? '?'} ${failure.reason ?? ''}`,
        );
    }
    process.exit(result.failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
    console.error('Erro ao restaurar:', errorMessage(error));
    process.exit(1);
});
