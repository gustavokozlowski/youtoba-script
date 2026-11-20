import { setting } from '../../config/settings';
// Banco SQLite local: guarda o refresh token cifrado e o consumo diário de quota.
export const dbPath = () => setting('TOKEN_DB_PATH');
