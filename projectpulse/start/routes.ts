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
const AuthController = () => import('#controllers/auth_controller')
router.use([
  // ...
  () => import('#middleware/silent_auth_middleware')
])

// Routes pour les utilisateurs non connectés (guest)
router.group(() => {
  // Route pour afficher la page de connexion
  router.get('/login', [AuthController , 'showLogin'])
  router.get('/login_fast', [AuthController , 'login'])
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

router
  .get('dashboard', async ({ auth }) => {
    await auth.user!.getAllMetrics()
  })
  .use(middleware.auth())
