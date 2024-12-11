// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { registerValidator, loginValidator } from '#validators/auth'
import logger from '@adonisjs/core/services/logger'
import User from '#models/user'

export default class AuthController {
  /**
   * Renders the login page.
   *
   * @param {HttpContextContract} context - The context object containing the view.
   * @returns {Promise<void>} A promise that resolves to the rendered login page.
   */
  public async showLogin({ view }: HttpContextContract) {
    return view.render('pages/login')
  }

  /**
   * Handles the login process for a user.
   *
   * @param {HttpContextContract} ctx - The context object containing request, auth, response, and session.
   * @returns {Promise<void>} - Redirects the user based on the login outcome.
   *
   * @remarks
   * This method attempts to log in a user using their email and password. If the credentials are correct,
   * the user is logged in and redirected to the '/dashboard' page. If the credentials are incorrect,
   * a flash message is set and the user is redirected back to the login page. In case of any other errors,
   * a generic error message is flashed and the user is redirected to the login page.
   *
   * @example
   * ```typescript
   * await login({ request, auth, response, session });
   * ```
   */
  public async login({ request, auth, response, session }: HttpContextContract) {
      let email: string
      let password: string
  
      try {
        const validatedData = await request.validate(loginValidator)
        email = validatedData.email
        password = validatedData.password
        const user = await User.verifyCredentials(email, password)
        await auth.use('web').login(user)
        return response.redirect('/dashboard')
      } catch (error) {
        logger.error("Erreur lors de la validation des données de connexion")
        logger.error(error)
        session.flash('notification', {
          type: 'error',
          message: 'Une erreur est survenue lors de la connexion.',
        })
        return response.redirect('back')
      }
  }

  /**
   * Handles the fast login process for a user.
   *
   * @param {HttpContextContract} ctx - The context object containing request, auth, response, and session.
   * @returns {Promise<void>} - Redirects the user based on the login outcome.
   *
   * @remarks
   * This method attempts to log in a user using their email and password. If the credentials are correct,
   * the user is logged in and redirected to the '/dashboard' page. If the credentials are incorrect,
   * a flash message is set and the user is redirected back to the login page. In case of any other errors,
   * a generic error message is flashed and the user is redirected to the login page.
   *
   * @example
   * ```typescript
   * await loginFast({ request, auth, response, session });
   * ```
   */
  public async loginFast({ request, auth, response, session }: HttpContextContract) {

    logger.info("Tentative de connexion avec l'email " + request.input('email'))
    try {
      const { email, password } = request.validateUsing(loginValidator)
      const user = await User.verifyCredentials(email, password)
      if (user) {
        await auth.use('web').login(user)
        return response.redirect('/dashboard')
      } else {
        session.flash('notification', {
          type: 'error',
          message: 'Email ou mot de passe incorrect.',
        })
        return response.redirect('/login')
      }
    } catch (error) {
      if (error.code == 'E_INVALID_CREDENTIALS') {
        session.flash('notification', {
          type: 'error',
          message: 'Email ou mot de passe incorrect.',
        })
        return response.redirect('/login')
      }
      session.flash('notification', {
        type: 'error',
        message: 'Une erreur est survenue lors de la connexion.',
      })
      return response.redirect('/login')
    }
  }

  /**
   * Renders the registration page.
   *
   * @param {HttpContextContract} context - The context object containing the view.
   * @returns {Promise<void>} A promise that resolves to the rendered registration page.
   */
  public async showRegister({ view }: HttpContextContract) {
    return view.render('pages/register')
  }

  /**
   * Registers a new user with the provided details.
   *
   * @param {HttpContextContract} ctx - The context object containing request, auth, response, and session.
   * @returns {Promise<void>} - Redirects the user based on the outcome of the registration process.
   *
   * @remarks
   * This method performs the following steps:
   * 1. Extracts `fullName`, `email`, `password`, and `password_confirmation` from the request.
   * 2. Formats the `fullName` by replacing spaces with hyphens and capitalizing the first letter.
   * 3. Checks if the `password` matches the `password_confirmation`. If not, flashes an error message and redirects back.
   * 4. Checks if the `fullName` is one of the disallowed names. If so, flashes an error message and redirects back.
   * 5. Attempts to create a new user and log them in. If successful, redirects to the dashboard page.
   * 6. Handles errors such as duplicate email entries and flashes appropriate error messages.
   *
   * @throws {Error} - Throws an error if there is an issue during the user creation process.
   */
  public async register({ request, auth, response, session }: HttpContextContract) {
    let fullName: string = ''
    let email: string = ''
    let password: string
    try {
      const validatedData= await request.validateUsing(registerValidator)
      fullName = validatedData.fullName
      email = validatedData.email
      password = validatedData.password
      logger.info("Inscription de %s avec l'email %s", fullName, email)
      const user = await User.create({ fullName: fullName, email, password })
      await auth.use('web').login(user)
      return response.redirect('/dashboard')
    } catch (error) {
      logger.error("Erreur lors de la validation des données de connexion")
      logger.error(error)
      if (error.code === 'E_VALIDATION_ERROR') {
        error.messages.forEach((message : any) => {
          if (message.rule === 'sameAs' && message.field === 'password_confirmation') {
            session.flash('notification', {
              type: 'error',
              message: "Les mots de passe ne correspondent pas.",
            })
          } else if (message.rule === 'unique' && message.field === 'email') {
            session.flash('notification', {
              type: 'error',
              message: "L'email est déjà utilisé.",
            })
          } else if (message.rule === 'minLength' && message.field === 'password') {
            session.flash('notification', {
              type: 'error',
              message: "Le mot de passe doit contenir au moins 8 caractères.",
            })
          } else {
            session.flash('notification', {
              type: 'error',
              message: "Une erreur est survenue lors de la validation des données.",
            })
          }
        })
      } else {
        session.flash('notification', {
          type: 'error',
          message: 'Une erreur est survenue lors de la connexion.',
        })
      }

      return response.redirect('back')
    }
  }

  /**
   * Logs out the currently authenticated user and redirects to the home page.
   *
   * @param {HttpContextContract} context - The context object containing the authentication and response objects.
   * @returns {Promise<void>} A promise that resolves when the user is logged out and the response is redirected.
   */
  public async logout({ auth, response }: HttpContextContract) {
    await auth.use('web').logout()
    return response.redirect('/')
  }

  /**
   * Renders the logout page.
   *
   * @param {HttpContextContract} context - The HTTP context containing the view to render.
   * @returns {Promise<void>} A promise that resolves when the view is rendered.
   */
  public async showLogout({ view }: HttpContextContract) {
    return view.render('pages/logout')
  }
}
