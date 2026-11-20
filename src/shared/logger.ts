import pino, { type DestinationStream, type LoggerOptions } from 'pino';

/**
 * Defesa extra: mesmo que alguém logue o objeto inteiro de um erro do axios ou a resposta do
 * Google, o header de autorização e os tokens saem como [omitido].
 */
const REDACT_PATHS = [
    'headers.authorization',
    '*.headers.authorization',
    'config.headers.Authorization',
    '*.config.headers.Authorization',
    'access_token',
    'refresh_token',
    '*.access_token',
    '*.refresh_token',
];

export const createLogger = (options: LoggerOptions, destination?: DestinationStream) =>
    // base: undefined tira pid e hostname (o nome da máquina) de cada linha.
    pino({ ...options, base: undefined, redact: { paths: REDACT_PATHS, censor: '[omitido]' } }, destination);

// Legível no terminal (npm run dev), JSON quando a saída não é um terminal (CI), mudo nos testes.
// Lê process.env direto: shared/ não depende de nada do projeto (ADR 0001); LOG_LEVEL é validado no boot.
const testing = process.env.VITEST !== undefined;
const pretty = process.stdout.isTTY && !testing;

export const logger = createLogger({
    level: process.env.LOG_LEVEL ?? (testing ? 'silent' : 'info'),
    ...(pretty && {
        transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } },
    }),
});
