const { Router } = require("express");
const {
	getAllPlaylists,
	getPlaylistItems,
} = require("../controllers/playlist.controller.js");

const router = new Router();

router.get("/get-all", getAllPlaylists);
router.get("/:playlistId", getPlaylistItems);

module.exports = router;
