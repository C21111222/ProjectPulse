/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

import transmit from '@adonisjs/transmit/services/main'
import app from '@adonisjs/core/services/app'
transmit.registerRoutes()

router.use([() => import('#middleware/silent_auth_middleware')])
const AuthController = () => import('#controllers/auth_controller')
const MessagesController = () => import('#controllers/messages_controller')
const UsersController = () => import('#controllers/users_controller')
const ImagesController = () => import('#controllers/images_controller')

// Routes pour les utilisateurs non connectés (guest)
router
  .group(() => {
    // Route pour afficher la page de connexion
    router.get('/login', [AuthController, 'showLogin'])
    router.post('/login_fast', [AuthController, 'loginFast'])
    // Route pour soumettre le formulaire de connexion
    router.post('/login', [AuthController, 'login'])

    // Route pour afficher la page d'inscription
    router.get('/register', [AuthController, 'showRegister'])

    // Route pour soumettre le formulaire d'inscription
    router.post('/register', [AuthController, 'register'])
  })
  .use(middleware.guest())

router.get('/chat', [MessagesController, 'index']).as('chat').use(middleware.auth())

router.get('/unviewed_chats', [MessagesController, 'unviewedChats']).as('chat_fast').use(middleware.auth())

// Route pour se déconnecter
router.get('/logout', [AuthController, 'logout'])

// Page d'accueil, accessible à tous
router.on('/home').render('pages/homePage')
router.on('/').render('pages/homePage')
// Page connected, accessible seulement aux utilisateurs connectés
router.on('/profile').render('pages/profile').use(middleware.auth())
router.post('/profile', [UsersController, 'updateProfile']).use(middleware.auth())
router.on('/connected').render('pages/connected').use(middleware.auth())

router.get('/messages', [MessagesController, 'getHistory']).use(middleware.auth())
router.post('/messages', [MessagesController, 'sendMessage']).use(middleware.auth())
router.post('/messages_viewed', [MessagesController, 'haveView']).use(middleware.auth())
router.post('/message_viewed', [MessagesController, 'haveViewSingle']).use(middleware.auth())

router.get("/img/:path", async ({ params, response }) => {
  return response.download(app.makePath(`/app/uploads/${params.path}`))
})
router.post('/img', [ImagesController, 'upload']).use(middleware.auth())
router.delete('/img/:filename', [ImagesController, 'deleteImage']).use(middleware.auth())
