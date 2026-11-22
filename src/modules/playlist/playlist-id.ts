const PLAYLIST_ID = /^[A-Za-z0-9_-]{2,64}$/;

/** Id de playlist aceito na borda: só letras, números, `_` e `-`. Vale para o que vem na rota e na query. */
export const isPlaylistId = (value: unknown): value is string => typeof value === 'string' && PLAYLIST_ID.test(value);
