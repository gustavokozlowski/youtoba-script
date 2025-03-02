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

		return res.status(200).json({
			mensagem: "DEU BOM CARAAALHO!",
			resultado: initialPlaylist,
		});
	} catch (e) {
		console.error("Error daqueles", e);

		return res.status(400).json({ messagem: "deu merda no get heein" });
	}
};

const removeItemsDulicated = () => {
	// usaremos esses dados dentro dos items para mapealos pelo id e remover suas réplicas
	//  "contentDetails": {
	//     "videoId": "huHT9E6d73s",
	//     "videoPublishedAt": "2023-02-04T16:00:22Z"
	//   }
};

module.exports = {
	getAllPlaylists,
	// removeItemsDulicated,
	getPlaylistItems,
};

// EXEMPLO QUE ESTAVAMOS UTILIZANDO ANTES DE REFINAR A FUNCTION removeItemsDulicated
// .then((playlistData) => {
//     // biome-ignore lint/style/useConst: <explanation>
//     let nextPage = ""

//     for (let index = 0; index < quantity; index++) {
//         if (initialPlaylist.length < playlistData.data.items.length) {
//             playlistData.data.items.map((item) => {
//                 return initialPlaylist.push(item)
//             })
//         } if (initialPlaylist.length > playlistData.data.items.length) {
//             axios.request({
//                 method: 'GET',
//                 headers: {
//                     Authorization: `Bearer ${bearerToken.token}`,
//                     Accept: 'application/json',
//                     'Content-Type': 'application/json'
//                 },
//                 "Accept": "application/json",
//                 url: `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&part=id&part=contentDetails&pageToken=${nextPage}&playlistId=${playlistId}&key=${API_KEY}`
//             }).then((response) => {
//                 response.data
//             }).catch(e)
//         }

//     }
// })
