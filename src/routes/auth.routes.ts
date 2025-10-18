import { Router } from 'express';
import { authUserGetUrl, getAuthorizationToken, oauth2Client } from '../controllers/auth.controller';

const router = Router();

router.get('/', getAuthorizationToken);

router.get('/login', authUserGetUrl);

export { router };
