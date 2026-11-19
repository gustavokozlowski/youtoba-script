// Banco SQLite local: guarda o refresh token cifrado e o consumo diário de quota.
export const dbPath = () => process.env.TOKEN_DB_PATH ?? 'data/youtoba.db';
