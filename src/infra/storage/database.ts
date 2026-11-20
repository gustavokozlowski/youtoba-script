import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

/**
 * Abre o SQLite local, criando a pasta, e garante as tabelas. O arquivo guarda o token cifrado,
 * então só o dono lê (chmod 600), não importa qual store abriu primeiro.
 */
export function openDatabase(file: string, schema: string): Database.Database {
    const inMemory = file === ':memory:';
    if (!inMemory) fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new Database(file);
    if (!inMemory) fs.chmodSync(file, 0o600);
    db.exec(schema);
    return db;
}
