require("dotenv").config();
const axios = require("axios");
const { API_KEY } = process.env;
const { getToken } = require("../utils/repository/user.repository");

const getAllPlaylists = async (req, res) => {
	// const decode = jwt.verify(token, JWT_SECRET);
	const bearerToken = getToken("bearerToken");

	if (!bearerToken) {
		return res.send("Token inválido! Por favor, faça o login novamente!");
	}

	try {
		// const decoded = jwt.verify(bearerToken, JWT_SECRET);
		console.warn(
			"=============================== #GET_ALL_PLAYLISTS ==================================",
		);
		// console.log("decode: ", decoded)
		console.log("BEAR TOKEN: ", bearerToken.token);
		console.log("MSG TOKEN: ", bearerToken.message);
		const result = await axios({
			method: "GET",
			headers: {
				Authorization: `Bearer ${bearerToken.token}`,
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			Accept: "application/json",
			url: `https://youtube.googleapis.com/youtube/v3/playlists?part=contentDetails&mine=true&key=${API_KEY}`,
		});

		// console.info(result.headers)

		return res.status(200).json({
			mensagem: "DEU BOM CARAAALHO!",
			resultado: result.data,
		});
	} catch (e) {
		console.error("Error daqueles", e.response);

		return res.status(400).json({ messagem: "deu merda no get heein" });
	}
};

const getPlaylistInfoById = async (playlistId) => {
	const bearerToken = getToken("bearerToken");

	if (!bearerToken) {
		return res.send("Token inválido! Por favor, faça o login novamente!");
	}

	try {
		const playlistInfo = await axios({
			method: "GET",
			headers: {
				Authorization: `Bearer ${bearerToken.token}`,
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			Accept: "application/json",
			url: `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&key=${API_KEY}`,
		});

		const { totalResults } = playlistInfo.data.pageInfo;

		return {
			mensagem:
				"========================OLHA ESSA PLAYLIST==============================\n",
			totalPages: totalResults,
		};
	} catch (e) {
		console.error("Error daqueles:", e);

		return res.status(400).json({ messagem: "deu merda no get heein" });
	}
};

const getPlaylistItems = async (req, res) => {
	let initialPlaylist = [];
	const bearerToken = getToken("bearerToken");
	const { playlistId } = req.params;

	if (!bearerToken) {
		return res.send("Token inválido! Por favor, faça o login novamente!");
	}

	try {
		// const decoded = jwt.verify(token, JWT_SECRET);

		const result = await axios({
			method: "GET",
			headers: {
				Authorization: `Bearer ${bearerToken.token}`,
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			Accept: "application/json",
			url: `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&key=${API_KEY}`,
		});

		const { data } = result;

		const firstList = data.items.map((item) => item);

		initialPlaylist = [...firstList];

		console.info("Mais informações dessa Playlist", result.data);

		let nextPageToken = result.data.nextPageToken;

		do {
			const playlist = await axios({
				method: "GET",
				headers: {
					Authorization: `Bearer ${bearerToken.token}`,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				Accept: "application/json",
				url: `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&pageToken=${nextPageToken}&playlistId=${playlistId}&key=${API_KEY}`,
			});

			const playlistData = playlist.data;

			nextPageToken = playlistData.nextPageToken;

			playlistData.items.map((item) => initialPlaylist.push(item));

			if (!playlistData.nextPageToken) nextPageToken = undefined;
		} while (nextPageToken !== undefined);

        const filteredPlaylist = removeItemsDulicated(initialPlaylist);

		console.info(
			"======================== OLHA A DESCREPÂNCIA: ==============================\n",
			"Items na playlist nova:", filteredPlaylist.length, "\n",
			"Items na playlist original:", initialPlaylist.length,
		);

		return res.status(200).json({
			mensagem: "DEU BOM CARAAALHO!",
			resultado: filteredPlaylist,
		});

	} catch (e) {
		console.error("Error daqueles", e);

		return res.status(400).json({ messagem: "deu merda no get heein" });
	}
};

const removeItemsDulicated = (list) => {
    const newList = []

	list.forEach((item) => {
		const videoId = item.contentDetails.videoId;
		if (!newList.some((i) => i.contentDetails.videoId === videoId)) {
			newList.push(item);
		}
	});

	return newList;
};

module.exports = {
	getAllPlaylists,
	removeItemsDulicated,
	getPlaylistItems,
};
