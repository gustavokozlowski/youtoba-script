import { envSchema } from './env';
import type { Env } from './env.types';

/**
 * Uma variável de configuração, lida de process.env na hora e com o mesmo esquema do boot
 * (os padrões ficam só em env.ts). Sem cache: os testes trocam variáveis entre um boot e outro.
 */
export const setting = <K extends keyof Env>(key: K): Env[K] =>
    // O esquema de `key` produz exatamente Env[K]; o TypeScript só não liga shape[K] a Env[K] sozinho.
    envSchema.shape[key].parse(process.env[key]) as Env[K];
