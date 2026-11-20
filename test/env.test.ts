import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EnvError, loadEnv } from '../src/config/env';

const valid = () => ({
    API_KEY: 'chave-da-api',
    CLIENT_ID: '123-abc.apps.googleusercontent.com',
    CLIENT_SECRET_KEY: 'segredo-do-cliente',
    REDIRECT_URL: 'http://localhost:3000/auth',
    TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
});

const problemsOf = (source: Record<string, string | undefined>) => {
    try {
        loadEnv(source);
    } catch (error) {
        if (error instanceof EnvError) return error.problems;
        throw error;
    }
    return [];
};

describe('validação do .env no boot', () => {
    it('com tudo certo, devolve a configuração com os padrões preenchidos', () => {
        const env = loadEnv(valid());
        expect(env.PORT).toBe(3000);
        expect(env.ENABLE_DEV_ROUTES).toBe(false);
        expect(env.YOUTUBE_DAILY_QUOTA).toBe(10_000);
    });

    it('lista cada variável obrigatória que falta, de uma vez', () => {
        const problems = problemsOf({});
        expect(new Set(problems.map((p) => p.split(':')[0])).size).toBe(problems.length);
        for (const name of ['API_KEY', 'CLIENT_ID', 'CLIENT_SECRET_KEY', 'REDIRECT_URL', 'TOKEN_ENCRYPTION_KEY']) {
            expect(problems.some((p) => p.startsWith(`${name}:`))).toBe(true);
        }
    });

    it('recusa valores com formato errado', () => {
        const problems = problemsOf({
            ...valid(),
            CLIENT_ID: 'nao-e-um-client-id',
            REDIRECT_URL: 'localhost/auth',
            TOKEN_ENCRYPTION_KEY: 'curta',
            PORT: 'abc',
            ENABLE_DEV_ROUTES: 'sim',
        });
        expect(problems.map((p) => p.split(':')[0]).sort()).toEqual(
            ['CLIENT_ID', 'ENABLE_DEV_ROUTES', 'PORT', 'REDIRECT_URL', 'TOKEN_ENCRYPTION_KEY'].sort(),
        );
    });

    it('a mensagem de erro nunca mostra o valor (são segredos)', () => {
        const secret = 'segredo-que-nao-pode-aparecer';
        const source = { ...valid(), TOKEN_ENCRYPTION_KEY: secret, CLIENT_ID: secret };
        expect(() => loadEnv(source)).toThrow(EnvError);
        try {
            loadEnv(source);
        } catch (error) {
            expect(String((error as Error).message)).not.toContain(secret);
            expect((error as EnvError).problems.join(' ')).not.toContain(secret);
        }
    });
});
