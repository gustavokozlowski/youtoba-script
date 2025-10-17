import { Router } from "express";
import { authUserGetUrl, getAuthorizationToken, oauth2Client } from "..controllers/";

const router = Router();

router.get('/', getAuthorizationToken);

router.get('/login', authUserGetUrl)

module.exports = router;