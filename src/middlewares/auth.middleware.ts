import type { NextFunction, Request, Response } from 'express';
import { authRouter } from '../routes/auth.routes';
import { getToken } from '../utils/repository/user.repository';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tokenResponse = getToken('bearerToken');

        if (!tokenResponse.token) {
            return res.status(401).redirect('/auth/login');
        }

        // Armazena o token no request para usar depois
        (req as any).token = tokenResponse.token;
        next();
    } catch (error) {
        console.error('Erro no middleware de autenticação:', error);
        return res.status(401).redirect('/auth/login');
    }
};

authRouter.use(authMiddleware);
