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

transmit.registerRoutes()

router.use([
  () => import('#middleware/silent_auth_middleware')
])
const AuthController = () => import('#controllers/auth_controller')


// Routes pour les utilisateurs non connectés (guest)
router.group(() => {
  // Route pour afficher la page de connexion
  router.get('/login', [AuthController , 'showLogin'])
  router.post('/login_fast', [AuthController , 'loginFast'])
  // Route pour soumettre le formulaire de connexion
  router.post('/login', [AuthController , 'login'])

  // Route pour afficher la page d'inscription
  router.get('/register', [AuthController , 'showRegister'])

  // Route pour soumettre le formulaire d'inscription
  router.post('/register', [AuthController , 'register'])

}).use(middleware.guest())

// Route pour se déconnecter
router.get('/logout', [AuthController , 'logout'])

// Page d'accueil, accessible à tous
router.on('/home').render('pages/homePage')
router.on('/').render('pages/homePage')
// Page connected, accessible seulement aux utilisateurs connectés
router.on('/profile').render('pages/profile').use(middleware.auth())
router.on('/connected').render('pages/connected').use(middleware.auth())

