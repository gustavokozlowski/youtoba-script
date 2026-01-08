import type { NextFunction, Request, Response } from 'express';
import { getToken } from '../utils/repository/user.repository';

export const authMiddleware =  (req: Request, res: Response, next: NextFunction) => {
    try {
        const tokenResponse = getToken('bearerToken');

        if (!tokenResponse.token) {
            return res.status(401).redirect('/auth/login');
        }

        console.info('Token de autenticação encontrado no middleware.');
        // Armazena o token no request para usar depois
        (req as any).token = tokenResponse.token;
        next();
    } catch (error) {
        console.error('Erro no middleware de autenticação:', error);
        return res.status(401).redirect('/auth/login');
    }
};
