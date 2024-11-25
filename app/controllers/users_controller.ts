// import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'


export default class UsersController {

    async getAllUsers({ response }: HttpContext) {
        const users = await User.query().select('id', 'full_name', 'email')
        return response.json(users)
    }

    async getUser({ params, response }: HttpContext) {
        const user = await User.find(params.id)
        return response.json(user)
    }
}