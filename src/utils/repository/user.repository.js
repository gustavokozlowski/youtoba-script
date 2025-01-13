const NodeCache = require("node-cache");

export class UserRepository {
    #db = new NodeCache();

    saveToken(name, value) {
        success = this.#db.set(name, value)
        if (sucess !== true) {
            return {
                message: 'Error ao criar salvar token novo'
            }
        }
        return {
            message: 'Sucessada, #vadias!'
        }

    }

    getToken(name) {
        success = this.#db.get(name)
        if (sucess === undefined) {
            return {
                message: 'Esse token não existe!'
            }
        }
        return {
            message: 'Sucessada, #vadias! o token ta na mão!'
        }

    }

}
