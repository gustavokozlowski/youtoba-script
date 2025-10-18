import NodeCache from "node-cache";
import { AccessToken } from "./types";

const db = new NodeCache()

export function saveToken(name: string, value: string) {
    const success =  db.set(name, value)
    if (success !== true) {
        return success
    }
    return success

}

export async function getToken(name: string): Promise<AccessToken> {
   const token: string | undefined = await db.get(name)
    if (token === undefined || !token) {
        return {
            message: 'Esse token não existe!'
        } as AccessToken
    }
    return {
        message: 'Sucessada, #vadias! o token ta na mão!',
        token: token
    } as AccessToken
}
