// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import logger from '@adonisjs/core/services/logger'
import User from '#models/user'

export default class AuthController {
  // Affiche la page de connexion
  public async showLogin({ view }: HttpContextContract) {
    return view.render('pages/login')
  }

  public async login({ request, auth, response, session}: HttpContextContract) {
      const { email, password } = request.all();
      logger.info('Tentative de connexion avec l\'email %s', email);
      try {
        const user = await User.verifyCredentials(email, password);
        if (user) {
          await auth.use('web').login(user);      
          logger.info('Connexion réussie pour l\'email %s', email);
          return response.redirect('/connected'); 
        } else {
          logger.info('Connexion échouée pour l\'email %s', email);
          session.flash('notification',{ type: 'error', message: 'Email ou mot de passe incorrect.' });
          return response.redirect('back');
        }
      } catch (error) {
        logger.info('Connexion échouée pour l\'email %s', email);
        if (error.code == 'E_INVALID_CREDENTIALS') {
          session.flash('notification',{ type: 'error', message: 'Email ou mot de passe incorrect.' });
          return response.redirect('back');
        }
        session.flash('notification',{ type: 'error', message: 'Une erreur est survenue lors de la connexion.' });
        return response.redirect('back');
      }


    }


  // Affiche la page d'inscription
  public async showRegister({ view }: HttpContextContract) {
    return view.render('pages/register')
  }

  // Gère l'action d'inscription
  public async register({ request, auth, response, session }: HttpContextContract) {
    const { fullName,email, password, password_confirmation } = request.only([
      'fullName',
      'email',
      'password',
      'password_confirmation',
    ])

    if (password !== password_confirmation) {
      session.flash('notification', { type: 'error', message: 'Les mots de passe ne correspondent pas.' })
      return response.redirect('back')
    }
    if (fullName == "Kevin" || fullName == "kevin" || fullName == "kévin" || fullName == "Kévin" ||fullName == "Florent" || fullName == "florent" || fullName == "Simon" || fullName == "simon" ) {
      session.flash('notification', { type: 'error', message: 'Va poop frero.' })
      return response.redirect('back')
    }
    try {
      logger.info('Inscription de %s avec l\'email %s', fullName, email)
      const user = await User.create({ fullName, email, password })
      await auth.use('web').login(user)
      return response.redirect('/connected')
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        session.flash('notification', { type: 'error', message: 'Cet email est déjà utilisé'})
        return response.redirect('back')
      }
      session.flash('notification', { type: 'error', message: 'Une erreur est survenue lors de l\'inscription.' })
      return response.redirect('back')
    }
  }

  // Gère la déconnexion
  public async logout({ auth, response }: HttpContextContract) {
    await auth.use('web').logout()
    return response.redirect('/') 
  }

    // Affiche la page de déconnexion
    public async showLogout({ view }: HttpContextContract) {
        return view.render('pages/logout')
    }
}
