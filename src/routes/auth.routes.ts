import { Router } from 'express';
import { authUserGetUrl, getAuthorizationToken } from '../controllers/auth.controller';

const router = Router();

router.get('/', getAuthorizationToken);

router.get('/login', authUserGetUrl);

export { router };
