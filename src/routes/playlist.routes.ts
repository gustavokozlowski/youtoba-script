import { Router } from "express";
import { getAllPlaylists, getPlaylistItems } from "../controllers/playlist.controller";

const router = Router();

router.get("/get-all", getAllPlaylists);
router.get("/:playlistId", getPlaylistItems);

export { router };