/** Lê um cookie do header Cookie. Só o que o servidor precisa; sem dependência extra. */
export function readCookie(header: string | undefined, name: string): string | undefined {
    for (const part of header?.split(';') ?? []) {
        const [key, ...value] = part.trim().split('=');
        if (key === name) return decodeURIComponent(value.join('='));
    }
    return undefined;
}
