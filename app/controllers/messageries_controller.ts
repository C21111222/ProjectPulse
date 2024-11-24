// import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class MessageriesController {
    async index({ view}) {
        // Récupérer les utilisateurs actifs (ou tous les utilisateurs, selon vos critères)
        const users = await User.getAllUsers()
    
        // Passer les utilisateurs à la vue Edge
        return view.render('pages/chat', { users: users.map(user => user.serialize()) })
      }

}