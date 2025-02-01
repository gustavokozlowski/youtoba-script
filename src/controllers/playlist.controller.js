require('dotenv').config()
const axios = require('axios');
const { API_KEY } = process.env
const { getToken } = require('../utils/repository/user.repository');
const e = require('express');

const getAllPlaylists = async (req, res) => {
    // const decode = jwt.verify(token, JWT_SECRET);
    const bearerToken = getToken("bearerToken")

    if (!bearerToken) {
        return res.send('Token inválido! Por favor, faça o login novamente!')
    }

    try {
        // const decoded = jwt.verify(bearerToken, JWT_SECRET);
        console.warn('=============================== #GET_ALL_PLAYLISTS ==================================')
        // console.log("decode: ", decoded)
        console.log("BEAR TOKEN: ", bearerToken.token)
        console.log("MSG TOKEN: ", bearerToken.message)
        const result = await axios({
            method: 'GET',
            headers: {
                Authorization: `Bearer ${bearerToken.token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            "Accept": "application/json",
            url: `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet%2CcontentDetails&mine=true&key=${API_KEY}`

        })

        // console.info(result.headers)

        return res.status(200).json({
            mensagem: "DEU BOM CARAAALHO!",
            resultado: result.data
        })

    } catch (e) {

        console.error("Error daqueles", e.response)

        return res.status(400).json({ messagem: "deu merda no get heein" })
    }
}

const getPlaylistInfoById = async (playlistId) => {
    const bearerToken = getToken("bearerToken")

    if (!bearerToken) {
        return res.send('Token inválido! Por favor, faça o login novamente!')
    }

    try {
        const playlistInfo = await axios({
            method: 'GET',
            headers: {
                Authorization: `Bearer ${bearerToken.token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            "Accept": "application/json",
            url: `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet%2CcontentDetails&playlistId=${playlistId}&key=${API_KEY}`

        })

        const { contentDetails, localized } = playlistInfo.data.items[0]
        const playlistLength = contentDetails.itemCount
        const { title, description } = localized

        return {
            mensagem: "========================OLHA ESSA PLAYLIST==============================\n",
            quantity: playlistLength,
            name: title,
            description: description
        }

    } catch (e) {

        console.error("Error daqueles", e.response)

        return res.status(400).json({ messagem: "deu merda no get heein" })
    }
}

const removeItemsDulicated = async (req, res) => {
    const initialPlaylist = []
    const bearerToken = getToken("bearerToken")
    const { playlistId } = req.body
    // biome-ignore lint/style/useConst: <explanation>
    let pageLimit = 5
    // biome-ignore lint/style/useConst: <explanation>
    let thisPageLimit = 0

    if (!bearerToken) {
        return res.send('Token inválido! Por favor, faça o login novamente!')
    }

    try {
        // const decoded = jwt.verify(token, JWT_SECRET);
        const playlistInfo = await getPlaylistInfoById(playlistId)
        const { quantity } = playlistInfo

        const result = await axios({
            method: 'GET',
            headers: {
                Authorization: `Bearer ${bearerToken.token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            "Accept": "application/json",
            url: `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&part=id&part=contentDetails&playlistId=${playlistId}&key=${API_KEY}`,
        }).then((playlistData) => {
            // biome-ignore lint/style/useConst: <explanation>
            let nextPage = ""

            for (let index = 0; index < quantity; index++) {
                if (initialPlaylist.length < playlistData.data.items.length) {
                    playlistData.data.items.map((item) => {
                        return initialPlaylist.push(item)
                    })
                } if (initialPlaylist.length > playlistData.data.items.length) {
                    axios.request({
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${bearerToken.token}`,
                            Accept: 'application/json',
                            'Content-Type': 'application/json'
                        },
                        "Accept": "application/json",
                        url: `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&part=id&part=contentDetails&pageToken=${nextPage}&playlistId=${playlistId}&key=${API_KEY}`
                    }).then((response) => {
                        response.data
                    }).catch(e)
                }


            }
        })

        result.data

        const playlist = [...result.data]



        // console.info(result.headers)
        return res.status(200).json({
            mensagem: "DEU BOM CARAAALHO!",
            resultado: result.data
        })

    } catch (e) {

        console.error("Error daqueles", e.response)

        return res.status(400).json({ messagem: "deu merda no get heein" })
    }

}

module.exports = {
    getAllPlaylists,
    removeItemsDulicated
};