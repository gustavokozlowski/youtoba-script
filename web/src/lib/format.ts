const integer = new Intl.NumberFormat('pt-BR');

export const num = (n: number) => integer.format(n);

export const units = (n: number) => `${num(n)} ${n === 1 ? 'unidade' : 'unidades'}`;

export const daysLabel = (days: number) => `${days} ${days === 1 ? 'dia' : 'dias'} de cota`;

export const thumbnail = (videoId: string) => `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
