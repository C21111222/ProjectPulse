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
   * Handles the request to view a user's public profile.
   * 
   * @param {HttpContext} context - The HTTP context object containing the request, authentication, and view.
   * @returns {Promise<View>} - The rendered view of the user's profile or a 404 page if the user is not found.
   * 
   * @remarks
   * - If the user is not found, it renders a 404 page.
   * - If the authenticated user is viewing their own profile, it renders the profile page.
   * - Otherwise, it renders the public profile page of the user.
   */
  async viewPublicProfile({ auth, request, view }: HttpContext) {
    const userId = request.input('user_id')
    const user = await User.find(userId)
    if (!user) {
      return view.render('pages/404')
    }
    if (auth.user!.id === user.id) {
      return view.render('pages/profile', { user })
    }

    return view.render('pages/publicProfile', { user })
  }

  /**
   * Updates the profile of the authenticated user.
   *
   * @param {HttpContext} context - The HTTP context object containing the request, auth, and response.
   * @returns {Promise<void>} - A promise that resolves when the user's profile has been updated and the response has been redirected.
   *
   * @remarks
   * This method retrieves the authenticated user's ID from the auth object, finds the user in the database,
   * updates the user's full name with the value from the request input, saves the updated user, and redirects
   * the response to the profile page.
   */
  async updateProfile({ request, auth, response }: HttpContext) {
    const userId = auth.user!.id
    const user = await User.findOrFail(userId)
    const fullName = request.input('fullname')
    user.fullName = fullName
    await user.save()

    return response.redirect('/profile')
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

  /**
   * Retrieves the teams associated with the authenticated user.
   *
   * @param {HttpContext} context - The HTTP context containing the authentication and response objects.
   * @returns {Promise<void>} - A promise that resolves to a JSON response containing the user's teams.
   */
  async getTeams({ auth, response }: HttpContext) {
    const user = await User.find(auth.user!.id)
    const teams = await user!.related('teams').query()
    return response.json(teams)
  }
}
