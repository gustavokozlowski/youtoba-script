require('dotenv').config();

import { EnvError, loadEnv } from '../config/env';
import { googleAuth } from '../modules/auth/google-auth.service';
import { logger } from '../shared/logger';
import { createApp } from './app';

/** Sobe só com o .env válido; senão diz o que falta e sai, sem mostrar nenhum valor. */
function envOrExit() {
    try {
        return loadEnv();
    } catch (error) {
        if (!(error instanceof EnvError)) throw error;
        // console, não o logger: o processo sai logo em seguida e o transport do pino é assíncrono.
        console.error(error.message);
        process.exit(1);
    }
}

const { PORT } = envOrExit();
const auth = googleAuth();

createApp().listen(PORT, () => {
    logger.info(`Servidor rodando em http://localhost:${PORT}`);
    if (auth.isConnected()) {
        logger.info('Conta do YouTube já conectada (login salvo).');
    } else {
        logger.info(`Para conectar sua conta do YouTube, abra: http://localhost:${PORT}/auth/login`);
    }
});
