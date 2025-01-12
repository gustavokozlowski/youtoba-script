require('dotenv').config()
const express = require("express")
const cors = require('cors')
const { authenticate } = require('../middlewares/auth,middlewares.js')
const { PORT } = process.env
const playlistRoutes = require('../routes/playlist.routes.js')
const authRoutes = require('../routes/auth.routes.js')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.use('/playlist', authenticate, playlistRoutes)
app.use('/auth', authRoutes)

app.listen(PORT, () => {
    console.log(`Servidor rodando liso na porta ${PORT}`)
})
