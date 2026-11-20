const integer = new Intl.NumberFormat('pt-BR');

export const num = (n: number) => integer.format(Number.isFinite(n) ? Math.max(0, n) : 0);

export const units = (n: number) => `${num(n)} ${n === 1 ? 'unidade' : 'unidades'}`;

export const daysLabel = (days: number) => `${days} ${days === 1 ? 'dia' : 'dias'} de cota`;

export const thumbnail = (videoId: string) => `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;

export const quotaResetTime = (value: string) => value.split(' ').at(-1);

export const shortDateTimeLabel = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

export const savedAtLabel = (ms: number) =>
    new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(ms));
