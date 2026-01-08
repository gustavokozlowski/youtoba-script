
import type { Request, Response, NextFunction } from 'express';
import { getToken } from '../utils/repository/user.repository';
import { authRouter } from '../routes/auth.routes';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tokenResponse = getToken('bearerToken');

        if (!tokenResponse.token) {
            return res.status(401).redirect('/login');
        }

        // Armazena o token no request para usar depois
        (req as any).token = tokenResponse.token;
        next();
    } catch (error) {
        console.error('Erro no middleware de autenticação:', error);
        return res.status(401).redirect('/login');
    }
};


authRouter.use(authMiddleware);