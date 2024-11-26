// import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'


export default class UsersController {

    /**
     * Retrieves all users from the database and returns their id, full name, and email.
     *
     * @param {HttpContext} context - The HTTP context object containing the response object.
     * @returns {Promise<void>} A promise that resolves to void. The response object is used to send the JSON response containing the users.
     */
    async getAllUsers({ response }: HttpContext) {
        const users = await User.query().select('id', 'full_name', 'email')
        return response.json(users)
    }

    /**
     * Retrieves a user by their ID.
     * 
     * @param {HttpContext} context - The HTTP context containing the request parameters and response object.
     * @param {Object} context.params - The request parameters.
     * @param {string} context.params.id - The ID of the user to retrieve.
     * @param {Object} context.response - The response object used to send the JSON response.
     * 
     * @returns {Promise<void>} A promise that resolves to void.
     */
    async getUser({ params, response }: HttpContext) {
        const user = await User.find(params.id)
        return response.json(user)
    }
}