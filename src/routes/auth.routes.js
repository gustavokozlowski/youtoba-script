const { Router } = require("express");
const { authUserGetUrl, getAuthorizationToken, oauth2Client } = require("../controllers/auth.controller.js");

const router = new Router();

router.get('/', getAuthorizationToken);

router.get('/login', authUserGetUrl)

module.exports = router;