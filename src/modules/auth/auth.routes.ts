import { Router } from 'express';
import { authStatus, authUserGetUrl, getAuthorizationToken, logout } from './auth.controller';

const authRouter = Router();

authRouter.get('/', getAuthorizationToken);
authRouter.get('/login', authUserGetUrl);
authRouter.get('/status', authStatus);
authRouter.post('/logout', logout);

export { authRouter };
