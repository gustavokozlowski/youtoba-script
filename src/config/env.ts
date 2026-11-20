import { z } from 'zod';
import { KEY_HELP } from '../utils/crypto';
import type { Env } from './env.types';

const MISSING = 'falta (veja o .env.example)';
const ENCRYPTION_KEY_BYTES = 32;

/** Texto obrigatório; vazio conta como ausente (o .env.example traz as chaves sem valor). */
const required = () => z.string({ error: MISSING }).min(1, { error: MISSING, abort: true });

const url = (example: string) =>
    z.url({
        error: (issue) => (issue.input === undefined ? MISSING : `precisa ser uma URL completa, ex.: ${example}`),
    });

export const envSchema = z.object({
    PORT: z.coerce.number({ error: 'precisa ser um número de porta' }).int().min(1).max(65_535).default(3000),
    API_KEY: required(),
    CLIENT_ID: required().regex(/\.apps\.googleusercontent\.com$/, 'não parece um client id do Google'),
    CLIENT_SECRET_KEY: required(),
    REDIRECT_URL: url('http://localhost:3000/auth'),
    YOUTUBE_BASE_URL: url('https://youtube.googleapis.com/youtube/v3/'),
    TOKEN_ENCRYPTION_KEY: required().refine(
        (value) => Buffer.from(value, 'base64').length === ENCRYPTION_KEY_BYTES,
        `precisa ter 32 bytes em base64. ${KEY_HELP}`,
    ),
    WEB_URL: url('http://localhost:5173/').optional(),
    ENABLE_DEV_ROUTES: z
        .enum(['true', 'false'], { error: 'use true ou false' })
        .default('false')
        .transform((value) => value === 'true'),
    TOKEN_DB_PATH: z.string().optional(),
    BACKUP_DIR: z.string().optional(),
    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'], {
            error: 'use fatal, error, warn, info, debug, trace ou silent',
        })
        .optional(),
    YOUTUBE_DAILY_QUOTA: z.coerce.number({ error: 'precisa ser um número' }).int().positive().default(10_000),
});

/** Configuração inválida. `problems` traz uma linha por variável, sem nunca mostrar o valor. */
export class EnvError extends Error {
    constructor(readonly problems: string[]) {
        super(`Configuração inválida no .env:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
        this.name = 'EnvError';
    }
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
    const result = envSchema.safeParse(source);
    if (result.success) return result.data;
    throw new EnvError(result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`));
}
