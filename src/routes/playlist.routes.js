const { Router } = require("express");
const { getAllPlaylists } = require("../controllers/playlist.controller.js");

const router = new Router();

router.get("/get-all", getAllPlaylists);

module.exports = router;