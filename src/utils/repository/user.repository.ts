import fs from 'node:fs';
import type { AccessToken } from './types';

export function saveToken(name: string, value: string) {
    // Verifica se o arquivo existe
    if (fs.existsSync('./config.json')) {
        // Arquivo existe, sobrescreve com o novo valor
        fs.writeFileSync(
            './config.json',
            JSON.stringify(
                {
                    [name]: value,
                },
                null,
                2,
            ),
        );
        return true;
    }

    // Se não existe, cria um novo
    fs.writeFileSync(
        './config.json',
        JSON.stringify(
            {
                [name]: value,
            },
            null,
            2,
        ),
    );

    return true;
}

export function getToken(name: string): AccessToken {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
    const token = config[name];
    if (token === undefined || !token) {
        return {
            message: 'Esse token não existe!',
        } as AccessToken;
    }

    return {
        message: 'Sucessada, #vadias! o token ta na mão!',
        token: token,
    } as AccessToken;
}
