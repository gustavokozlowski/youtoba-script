import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createPendingLogins } from '../src/services/google/pending-logins';

const TEN_MINUTES = 10 * 60_000;
const s256 = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

function clock(start = 0) {
    let now = start;
    return {
        now: () => now,
        advance: (ms: number) => {
            now += ms;
        },
    };
}

describe('logins pendentes (state + PKCE)', () => {
    it('cada login tem state e verifier aleatórios, e o challenge é o S256 do verifier', () => {
        const logins = createPendingLogins({ ttlMs: TEN_MINUTES, now: () => 0 });
        const a = logins.start();
        const b = logins.start();
        expect(a.state).not.toBe(b.state);

        const verifier = logins.consume(a.state);
        expect(verifier).toMatch(/^[\w-]{43}$/);
        expect(s256(verifier ?? '')).toBe(a.codeChallenge);
    });

    it('o state vale uma vez só', () => {
        const logins = createPendingLogins({ ttlMs: TEN_MINUTES, now: () => 0 });
        const { state } = logins.start();
        expect(logins.consume(state)).toBeDefined();
        expect(logins.consume(state)).toBeUndefined();
    });

    it('expira depois do prazo e não aceita state desconhecido', () => {
        const time = clock();
        const logins = createPendingLogins({ ttlMs: TEN_MINUTES, now: time.now });
        const { state } = logins.start();
        time.advance(TEN_MINUTES + 1);

        expect(logins.consume(state)).toBeUndefined();
        expect(logins.consume('inventado')).toBeUndefined();
    });

    it('logins abandonados não se acumulam: os vencidos saem quando um novo começa', () => {
        const time = clock();
        const logins = createPendingLogins({ ttlMs: TEN_MINUTES, now: time.now });
        for (let i = 0; i < 5; i++) logins.start();
        time.advance(TEN_MINUTES + 1);
        logins.start();
        expect(logins.size()).toBe(1);
    });
});
