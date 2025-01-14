const NodeCache = require("node-cache");

db = new NodeCache()

function saveToken(name, value) {
    success = this.db.set(name, value)
    if (success !== true) {
        return {
            message: 'Error ao criar salvar token novo'
        }
    }
    return {
        message: 'Sucessada, #vadias!'
    }

}

function getToken(name) {
    success = this.db.get(name)
    if (success === undefined) {
        return {
            message: 'Esse token não existe!'
        }
    }
    return {
        message: 'Sucessada, #vadias! o token ta na mão!',
        token: success
    }
}

module.exports = {
    getToken,
    saveToken
}