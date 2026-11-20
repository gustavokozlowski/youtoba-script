require('dotenv').config();

import { EnvError, loadEnv } from '../config/env';
import { googleAuth } from '../services/google';
import { createApp } from './app';

/** Sobe só com o .env válido; senão diz o que falta e sai, sem mostrar nenhum valor. */
function envOrExit() {
    try {
        return loadEnv();
    } catch (error) {
        if (!(error instanceof EnvError)) throw error;
        console.error(error.message);
        process.exit(1);
    }
}

const { PORT } = envOrExit();
const auth = googleAuth();

createApp().listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    if (auth.isConnected()) {
        console.log('Conta do YouTube já conectada (login salvo).');
    } else {
        console.log(`Para conectar sua conta do YouTube, abra: http://localhost:${PORT}/auth/login`);
    }
});
