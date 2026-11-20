export type Handler = { status?: number; body: unknown } | (() => { status?: number; body: unknown });
