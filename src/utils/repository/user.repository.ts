import NodeCache from "node-cache";

const db = new NodeCache()

export function saveToken(name, value) {
    success = db.set(name, value)
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
    success = db.get(name)
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