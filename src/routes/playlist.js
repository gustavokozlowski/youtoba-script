const { Router } = require("express");
const { getAllPlaylists} = require("../controllers/playlist.controller.js");

const router = new Router();

router.get("/api/v1/playlists/get-all", getAllPlaylists);
// router.get("/api/v1/greetings/users/:userId", GreetingController.helloUser);

module.exports = { router };