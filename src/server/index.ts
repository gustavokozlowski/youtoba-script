require('dotenv').config();

import { googleAuth } from '../services/google';
import { createApp } from './app';

const { PORT } = process.env;

// Falha cedo se a chave de criptografia do token estiver ausente ou inválida.
const auth = googleAuth();

createApp().listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    if (auth.isConnected()) {
        console.log('Conta do YouTube já conectada (login salvo).');
    } else {
        console.log(`Para conectar sua conta do YouTube, abra: http://localhost:${PORT}/auth/login`);
    }
});
