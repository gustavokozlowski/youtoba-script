import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, parseEncryptionKey } from '../src/infra/crypto';

const key = randomBytes(32);

describe('crypto', () => {
    it('cifra e decifra de volta o mesmo texto', () => {
        expect(decrypt(encrypt('1//refresh-token', key), key)).toBe('1//refresh-token');
    });

    it('gera um texto cifrado diferente a cada chamada (IV aleatório)', () => {
        expect(encrypt('igual', key)).not.toBe(encrypt('igual', key));
    });

    it('não deixa o texto original visível no resultado', () => {
        expect(encrypt('1//segredo', key)).not.toContain('segredo');
    });

    it('recusa dado adulterado', () => {
        const [version, iv, tag, data] = encrypt('1//refresh-token', key).split(':');
        const flipped = Buffer.from(data, 'base64');
        flipped[0] ^= 0xff;
        expect(() => decrypt([version, iv, tag, flipped.toString('base64')].join(':'), key)).toThrow();
    });

    it('recusa decifrar com outra chave', () => {
        expect(() => decrypt(encrypt('1//refresh-token', key), randomBytes(32))).toThrow();
    });

    it('exige uma chave de 32 bytes em base64', () => {
        expect(() => parseEncryptionKey(undefined)).toThrow(/TOKEN_ENCRYPTION_KEY/);
        expect(() => parseEncryptionKey(randomBytes(16).toString('base64'))).toThrow(/32 bytes/);
        expect(parseEncryptionKey(key.toString('base64')).equals(key)).toBe(true);
    });
});
