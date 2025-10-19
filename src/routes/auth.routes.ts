import { Router } from 'express';
import { authUserGetUrl, getAuthorizationToken } from '../controllers/auth.controller';

const authRouter = Router();

authRouter.get('/', getAuthorizationToken);

authRouter.get('/login', authUserGetUrl);

export { authRouter };
