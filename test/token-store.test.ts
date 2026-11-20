import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSqliteTokenStore } from '../src/infra/storage/token.store';

const key = randomBytes(32);
const dirs: string[] = [];

const tempDb = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtoba-store-'));
    dirs.push(dir);
    return path.join(dir, 'nested', 'tokens.db');
};

afterEach(() => {
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('SqliteTokenStore', () => {
    it('salva, lê, sobrescreve e apaga o refresh token', () => {
        const store = createSqliteTokenStore(tempDb(), key);
        expect(store.get('default')).toBeUndefined();
        store.save('default', 'rt-1');
        expect(store.get('default')).toBe('rt-1');
        store.save('default', 'rt-2');
        expect(store.get('default')).toBe('rt-2');
        store.delete('default');
        expect(store.get('default')).toBeUndefined();
        store.close();
    });

    it('mantém o token depois de fechar e reabrir o banco (reinício do servidor)', () => {
        const dbPath = tempDb();
        const first = createSqliteTokenStore(dbPath, key);
        first.save('default', 'rt-persistente');
        first.close();

        const second = createSqliteTokenStore(dbPath, key);
        expect(second.get('default')).toBe('rt-persistente');
        second.close();
    });

    it('nunca grava o token em texto puro no arquivo', () => {
        const dbPath = tempDb();
        const store = createSqliteTokenStore(dbPath, key);
        store.save('default', 'rt-texto-que-nao-pode-aparecer');
        store.close();
        expect(fs.readFileSync(dbPath).includes('rt-texto-que-nao-pode-aparecer')).toBe(false);
    });

    it('cria o arquivo só com permissão para o dono (600)', () => {
        const dbPath = tempDb();
        createSqliteTokenStore(dbPath, key).close();
        expect(fs.statSync(dbPath).mode & 0o777).toBe(0o600);
    });
});
