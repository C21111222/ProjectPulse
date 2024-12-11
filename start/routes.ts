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

// Middleware global
router.use([() => import('#middleware/silent_auth_middleware')])

// Contrôleurs
const AuthController = () => import('#controllers/auth_controller')
const MessagesController = () => import('#controllers/messages_controller')
const UsersController = () => import('#controllers/users_controller')
const ImagesController = () => import('#controllers/images_controller')
const TeamController = () => import('#controllers/teams_controller')
const NotificationController = () => import('#controllers/notifications_controller')
const TaskController = () => import('#controllers/tasks_controller')

/*
|--------------------------------------------------------------------------
| Routes publiques (guest)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('/login', [AuthController, 'showLogin'])
    router.post('/login', [AuthController, 'login'])
    router.post('/login_fast', [AuthController, 'loginFast'])
    router.get('/register', [AuthController, 'showRegister'])
    router.post('/register', [AuthController, 'register'])
  })
  .use(middleware.guest())

router.get('/logout', [AuthController, 'logout'])
router.get('/img/:path', async ({ params, response }) => {
  return response.download(app.makePath(`/app/uploads/${params.path}`))
})

router.group(() => {
  router.on('/').render('pages/homePage')
  router.on('/home').render('pages/homePage')
})

/*
|--------------------------------------------------------------------------
| Routes pour les utilisateurs connectés (auth)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    // Pages principales
    router.on('/profile').render('pages/profile')
    router.post('/profile', [UsersController, 'updateProfile'])
    router.get('/public_profile', [UsersController, 'viewPublicProfile'])
    router.on('/dashboard').render('pages/dashboard')

    // Messages
    router.get('/chat', [MessagesController, 'index']).as('chat')
    router.get('/personal_chat', [MessagesController, 'singleChat'])
    router.get('/unviewed_chats', [MessagesController, 'unviewedChats']).as('chat_fast')
    router.get('/messages', [MessagesController, 'getHistory'])
    router.get('/team_messages', [MessagesController, 'getTeamHistory'])
    router.post('/team_messages', [MessagesController, 'sendTeamMessage'])
    router.post('/messages', [MessagesController, 'sendMessage'])
    router.post('/messages_viewed', [MessagesController, 'haveView'])
    router.post('/message_viewed', [MessagesController, 'haveViewSingle'])

    // Images

    router.post('/img', [ImagesController, 'upload'])
    router.delete('/img/:filename', [ImagesController, 'deleteImage'])

    // Utilisateurs
    router.get('/users', [UsersController, 'getAllUsers'])

    // Équipes
    router.get('/teams', [UsersController, 'getTeams'])
    router.get('/team/:id', [TeamController, 'dashboardTeam'])
    router.get('/create_team', [TeamController, 'create'])
    router.post('/upload_team_image', [ImagesController, 'uploadTeam'])
    router.post('/teams', [TeamController, 'createTeam'])
    router.post('/send_invitation', [TeamController, 'sendInvitation'])
    router.post('/delete_from_team', [TeamController, 'deleteFromTeam'])
    router.get('/accept_invitation/:id', [TeamController, 'acceptInvitation'])
    router.post('/decline_invitation', [TeamController, 'declineInvitation'])
    router.post('/promote_user', [TeamController, 'promoteUser'])
    router.post('/demote_user', [TeamController, 'demoteUser'])
    router.post('/delete_team', [TeamController, 'deleteTeam'])
    router.post('/change_status', [TeamController, 'changeStatus'])

    // Tâches
    router.get('/tasks', [TaskController, 'getUserTasks'])
    router.get('/team_tasks/:id', [TaskController, 'getTeamTasks'])
    router.post('/tasks', [TaskController, 'addTask'])
    router.post('/delete_task', [TaskController, 'deleteTask'])
    router.post('/add_user_task', [TaskController, 'addUsersToTask'])

    // Notifications
    router.get('/notifications', [NotificationController, 'getNotifications'])
    router.delete('/notifications/:id', [NotificationController, 'deleteNotification'])
  })
  .use(middleware.auth())
