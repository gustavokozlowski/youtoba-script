/** A volta do Google: dá para trocar o code, ou há um motivo (HTML) para não concluir o login. */
export type LoginCallback = { code: string; codeVerifier: string } | { problem: string };
