import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const VERSION = 'v1';

export const KEY_HELP =
    "Gere uma com: node -e \"console.log(require('node:crypto').randomBytes(32).toString('base64'))\"";

export function parseEncryptionKey(raw: string | undefined): Buffer {
    const key = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
    if (key.length !== 32) {
        throw new Error(`TOKEN_ENCRYPTION_KEY ausente ou inválida: precisa ter 32 bytes em base64. ${KEY_HELP}`);
    }
    return key;
}

export function encrypt(plaintext: string, key: Buffer): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':');
}

export function decrypt(payload: string, key: Buffer): string {
    const [version, iv, tag, data] = payload.split(':');
    if (version !== VERSION || !iv || !tag || !data) {
        throw new Error('Dado cifrado em formato inválido');
    }
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
