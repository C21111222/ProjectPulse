import type { HttpContext } from '@adonisjs/core/http'
import Team from '#models/team'
import User from '#models/user'
import AuthService from '#services/auth_service'
import TeamService from '#services/team_service'
import Notification from '#models/notification'
import {
  NotificationTeamInvite,
  NotificationService,
  NotificationType,
  NotificationTeamInviteResponse,
} from '#services/notification_service'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { createTeamValidator } from '#validators/team'
enum Role {
  Admin = 'admin',
  Manager = 'manager',
  Member = 'member',
}

export default class TeamsController {
  public async create({ view }: HttpContext) {
    return view.render('pages/create_team')
  }
  /**
   * Handles the dashboard view for a specific team.
   *
   * @param {HttpContext} context - The HTTP context object containing view, auth, params, and response.
   * @returns {Promise<void>} - Renders the appropriate dashboard view based on the user's role in the team.
   *
   * @example
   * // Example request parameters
   * {
   * "id": "123"
   * }
   */
  public async dashboardTeam({ view, auth, params, response }: HttpContext) {
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const teamId = params.id
    const team = await TeamService.getTeamById(teamId)
    if (!team) {
      return response.status(404).json({ message: 'Equipe non trouvée' })
    }

    const role = await TeamService.getUserRoleInTeam(teamId, user.id)
    if (!role) {
      return response.status(403).json({ message: 'Accès interdit à cette équipe' })
    }

    const members = await TeamService.getTeamMembers(teamId)
    const availableUsers = await TeamService.getAvailableUsers(
      teamId,
      members.map((u) => u.user_id)
    )
    logger.info('members')
    logger.info(members)

    const viewPage =
      role === 'admin' || role === 'manager'
        ? 'pages/dashboard_team_admin'
        : 'pages/dashboard_team_member'

    return view.render(viewPage, {
      team,
      members,
      users: availableUsers,
    })
  }

  /**
   * Creates a new team.
   *
   * @param {HttpContext} context - The HTTP context containing the authenticated user, request, and response objects.
   * @returns {Promise<void>} - A promise that resolves to void.
   *
   * @throws {Error} - Throws an error if the team creation process fails.
   *
   * @example
   * // Example request payload
   * {
   * "name": "Team name",
   * "description": "Team description",
   * "imageUrl": "https://example.com/image.jpg",
   * "status": "active",
   * "start_date": "2022-01-01",
   * "end_date": "2022-12-31"
   * }
   */
  async createTeam({ auth, request, response }: HttpContext) {
    logger.info('Creating team')
    if (!auth.user) {
      return response
        .status(401)
        .json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    try {
      const teamData = await request.validateUsing(createTeamValidator)
      const team = await Team.create({
        name: teamData.name,
        description: teamData.description,
        imageUrl: teamData.imageUrl,
        status: teamData.status,
        startDate: request.input('start_date'),
        endDate: request.input('end_date'),
      })
      await TeamService.addMember(auth.user.id, team.id, Role.Admin)
      return response.json(team)
    } catch (error) {
      logger.error(error)
      return response
        .status(500)
        .json({ message: "Impossible de créer l'équipe : " + error.messages[0].message })
    }
  }

  /**
   * Changes the status of a team between 'active' and 'inactive'.
   *
   * @param {HttpContext} context - The HTTP context containing auth, request, and response objects.
   * @returns {Promise<void>} - A promise that resolves to void.
   *
   * @throws {Error} - Throws an error if the user is not authenticated, not authorized, or if there is an issue with the status change process.
   *
   * @example
   * // Example request payload
   * {
   * "teamId": "123"
   * }
   */
  async changeStatus({ auth, request, response }: HttpContext) {
    logger.info('Changing status')
    if (!auth.user) {
      return response
        .status(401)
        .json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const teamId = request.input('teamId')
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return
    // on verifie que l'utilisateur est bien admin de l'equipe
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', user.id)
      .select('role')
      .first()
    if (!role) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    if (role.role !== Role.Admin) {
      return response
        .status(403)
        .json({ message: "Vous n'avez pas les droits pour effectuer cette action" })
    }
    const team = await Team.find(teamId)
    if (!team) {
      return response.status(404).json({ message: 'Equipe non trouvée' })
    }
    // si le status est active on le passe à inactive et inversement
    if (team.status === 'active') {
      team.status = 'inactive'
    } else {
      team.status = 'active'
    }
    await team.save()
    return response.json(team)
  }

  /**
   * Sends an invitation to a user to join a team.
   *
   * @param {HttpContext} context - The HTTP context containing the auth, request, and response objects.
   * @returns {Promise<void>} - A promise that resolves when the invitation has been sent.
   *
   * @throws {Error} - Throws an error if the invitation cannot be sent.
   *
   * @remarks
   * - The user must be authenticated to send an invitation.
   * - The user must be an admin or manager of the team to send an invitation.
   * - Checks if there is already an ongoing invitation for the user to join the team.
   * - Sends a notification to the user if the invitation is successfully created.
   *
   * @example
   * // Example request payload
   * {
   * "teamId": "123",
   * "userId": "456"
   * }
   */
  async sendInvitation({ auth, request, response }: HttpContext) {
    logger.info('Sending invitation')
    if (!auth.user) {
      return response
        .status(401)
        .json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const { teamId, userId } = request.only(['teamId', 'userId'])
    // on verifie que l'utilisateur qui envoie la requete est bien admin ou manager de l'equipe

    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return
    // on recupere le role de l'utilisateur dans l'equipe qui se trouve dans le pivot

    const team = await Team.find(teamId)
    // on verifie qu'il n'y a pas déjà une invitation en cours
    const invitation = await Notification.query()
      .where('teamId', teamId)
      .where('inviteeId', userId)
      .where('type', NotificationType.TEAM_INVITE)
      .first()
    if (invitation) {
      return response.status(409).json({ message: 'Une invitation est déjà en cours' })
    }
    try {
      const notif = await Notification.create({
        teamId: teamId,
        inviterId: auth.user.id,
        inviteeId: userId,
        type: NotificationType.TEAM_INVITE,
      })

      const notification: NotificationTeamInvite = {
        notificationId: notif.id,
        teamId: teamId,
        teamName: team!.name,
        teamImage: team!.imageUrl,
        inviterId: auth.user.id,
        inviterName: auth.user.fullName || '',
        inviterImage: auth.user.imageUrl,
        type: NotificationType.TEAM_INVITE,
      }
      await NotificationService.sendNotification(`notifications/${userId}`, notification)
      return response.ok(JSON.stringify({ message: 'Invitation envoyée' }))
    } catch (error) {
      return response.status(500).json({ message: "Impossible d'envoyer l'invitation" })
    }
  }

  /**
   * Accepts an invitation to join a team.
   *
   * @param {HttpContext} context - The HTTP context containing the auth, params, and response objects.
   * @returns {Promise<void>} - A promise that resolves to void.
   *
   * @throws {Error} - Throws an error if the invitation cannot be accepted.
   *
   * @example
   * // Example request parameters
   * {
   * "id": "123"
   * }
   */
  async acceptInvitation({ auth, params, response }: HttpContext) {
    logger.info('Accepting invitation')
    if (!auth.user) {
      return response
        .status(401)
        .json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const notification1 = await Notification.query()
      .where('id', params.id)
      .where('invitee_id', auth.user.id)
      .first()
    if (!notification1) {
      return response.status(404).json({ message: 'Notification not found' })
    }
    const teamId = notification1.teamId
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return
    try {
      await TeamService.addMember(user.id, teamId, Role.Member)
      // on envoie une notification à tous les membres de l'équipe pour les informer de l'arrivée du nouveau membre
      const team = await Team.find(teamId)
      if (!team) {
        return response.status(404).json({ message: 'Equipe non trouvée' })
      }
      const notif = await Notification.create({
        teamId: teamId,
        inviterId: user.id,
        inviteeId: auth.user.id,
        type: NotificationType.TEAM_INVITE_ACCEPTED,
      })
      const notification: NotificationTeamInviteResponse = {
        notificationId: notif.id,
        teamId: teamId,
        teamName: team.name,
        teamImage: team.imageUrl,
        inviterId: user.id,
        inviterName: user.fullName || '',
        inviterImage: user.imageUrl,
        inviteeId: auth.user.id,
        inviteeName: auth.user.fullName || '',
        inviteeImage: auth.user.imageUrl,
        type: NotificationType.TEAM_INVITE_ACCEPTED,
      }

      await NotificationService.sendTeamNotification(teamId, notification)
      // on supprime la notification d'invitation
      await notification1.delete()
      return response.ok(JSON.stringify({ message: 'Invitation acceptée' }))
    } catch (error) {
      return response.status(500).json({ message: "Impossible d'accepter l'invitation" })
    }
  }

  /**
   * Declines an invitation to join a team.
   *
   * @param {HttpContext} context - The HTTP context containing the auth, request, and response objects.
   * @returns {Promise<void>} - A promise that resolves to void.
   *
   * @example
   * // Example request payload
   * {
   *  "notificationId": "123"
   * }
   *
   */
  async declineInvitation({ auth, request, response }: HttpContext) {
    logger.info('Declining invitation')
    if (!auth.user) {
      return response
        .status(401)
        .json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const notificationId = request.input('notificationId')
    const notification1 = await Notification.query()
      .where('id', notificationId)
      .where('invitee_id', auth.user.id)
      .first()
    if (!notification1) {
      return response.status(404).json({ message: 'Notification not found' })
    }

    const teamId = notification1.teamId
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return
    const team = await Team.find(teamId)
    if (!team) {
      return response.status(404).json({ message: 'Equipe non trouvée' })
    }
    // on envoie une notification à tous les membres de l'équipe pour les informer du refus de l'invitation

    try {
      const notif = await Notification.create({
        teamId: teamId,
        inviterId: user.id,
        inviteeId: auth.user.id,
        type: NotificationType.TEAM_INVITE_DECLINED,
      })
      const notification: NotificationTeamInviteResponse = {
        notificationId: notif.id,
        teamId: teamId,
        teamName: team.name,
        teamImage: team.imageUrl,
        inviterId: user.id,
        inviterName: user.fullName || '',
        inviterImage: user.imageUrl,
        inviteeId: auth.user.id,
        inviteeName: auth.user.fullName || '',
        inviteeImage: auth.user.imageUrl,
        type: NotificationType.TEAM_INVITE_DECLINED,
      }
      await NotificationService.sendTeamNotification(teamId, notification)
      // on supprime la notification d'invitation
      await notification1.delete()
      return response.ok(JSON.stringify({ message: 'Invitation refusée' }))
    } catch (error) {
      return response.status(500).json({ message: "Impossible de refuser l'invitation" })
    }
  }

  /**
   * Adds a user to a team.
   *
   * @param {HttpContext} context - The HTTP context containing auth, request, and response objects.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if the user is not authenticated, not authorized, or if there is an issue with the addition process.
   *
   * @example
   * // Example request payload
   * {
   *  "teamId": "123",
   * "userId": "456"
   * }
   *
   */
  async deleteFromTeam({ auth, request, response }: HttpContext) {
    logger.info('Deleting from team')
    if (!auth.user) {
      return response
        .status(401)
        .json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }

    const teamId = request.input('teamId')
    const userId = request.input('userId')
    console.log(request.all())

    const user = await User.findOrFail(auth.user.id)
    if (!(await TeamService.isUserAdminOrManagerOfTeam(user.id, teamId))) {
      return response
        .status(403)
        .json({ message: "Vous n'avez pas les droits pour effectuer cette action" })
    }

    const userRole = await TeamService.getUserRoleInTeam(userId, teamId)
    if (!userRole) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    if (userRole === 'admin') {
      return response
        .status(403)
        .json({ message: "Vous ne pouvez pas supprimer un administrateur de l'équipe" })
    } else if (
      userRole === 'manager' &&
      !(await TeamService.isUserAdminOrManagerOfTeam(user.id, teamId))
    ) {
      return response
        .status(403)
        .json({ message: "Vous ne pouvez pas supprimer un manager de l'équipe" })
    }

    const team = await Team.findOrFail(teamId)
    try {
      const userToRemove = await User.findOrFail(userId)
      const notification = await NotificationService.createTeamBannedNotification(
        teamId,
        auth.user.id,
        userId,
        team.name,
        team.imageUrl,
        auth.user.fullName || '',
        auth.user.imageUrl,
        userToRemove.fullName || '',
        userToRemove.imageUrl
      )
      await NotificationService.sendTeamNotification(teamId, notification)
      await TeamService.removeUserFromTeam(userId, teamId)
      return response.json({ message: "Utilisateur supprimé de l'équipe" })
    } catch (error) {
      logger.error('Error deleting user from team %s', error)
      return response
        .status(500)
        .json({ message: "Impossible de supprimer l'utilisateur de l'équipe" })
    }
  }

  /**
   * Promotes a user within a team to a higher role.
   *
   * @param {HttpContext} context - The HTTP context containing auth, request, and response objects.
   * @returns {Promise<void>} - A promise that resolves to void.
   * e   * @throws {Error} - Throws an error if the promotion process fails.   *      * @remarks}   * - The user must be authenticated to perform this action.
   * - Only team admins can promote other users within the team.
   * - A user cannot be promoted if they are already an admin.
   *
   * @example
   * // Example request payload
   * {
   *   "teamId": "123",
   *   "userId": "456"
   * }
   */
  async promoteUser({ auth, request, response }: HttpContext) {
    logger.info('Promoting user')
    if (!auth.user) {
      return response
        .status(401)
        .json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }

    const { teamId, userId } = request.only(['teamId', 'userId'])
    logger.info('Promoting user %s to team %s', userId, teamId)
    const user = await User.findOrFail(auth.user.id)
    if (!(await TeamService.isUserAdminOfTeam(user.id, teamId))) {
      return response
        .status(403)
        .json({ message: "Vous n'avez pas les droits pour effectuer cette action" })
    }

    const userRole = await TeamService.getUserRoleInTeam(userId, teamId)
    logger.info('User role %s', userRole)
    if (!userRole) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    if (userRole === 'admin') {
      return response
        .status(403)
        .json({ message: "Vous ne pouvez pas promouvoir un administrateur de l'équipe" })
    }

    try {
      if (userRole === 'manager') {
        await TeamService.promoteUserInTeam(userId, teamId, 'admin')
        return response.json({ message: 'Utilisateur promu admin' })
      } else {
        await TeamService.promoteUserInTeam(userId, teamId, 'manager')
        return response.json({ message: 'Utilisateur promu manager' })
      }
    } catch (error) {
      logger.error('Error promoting user %s', error)
      return response.status(500).json({ message: "Impossible de promouvoir l'utilisateur" })
    }
  }

  /**
   * Demotes a user from their current role in a team to a lower role.
   *
   * @param {HttpContext} context - The HTTP context containing the authenticated user, request, and response objects.
   * @returns {Promise<void>} - A promise that resolves to void.
   *    * @throws {Error} - Throws an error if the user is not authenticated, not authorized, or if there is an issue with the demotion process.     *    * @remarks *   * - The user must be authenticated to perform this action.c   * - Only team admins can demote other users.   * - Admins cannot be demoted.opriate HTTP responses based on the outcome.
   */
  async deleteTeam({ auth, params, response }: HttpContext) {
    logger.info('Deleting team')

    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const teamId = params.id

    if (!(await TeamService.isUserAdminOfTeam(user.id, teamId))) {
      return response
        .status(403)
        .json({ message: "Vous n'avez pas les droits pour effectuer cette action" })
    }

    try {
      await TeamService.deleteTeam(teamId)
      return response.json({ message: 'Equipe supprimée' })
    } catch (error) {
      logger.error('Error deleting team %s', error)
      return response.status(500).json({ message: "Erreur lors de la suppression de l'équipe" })
    }
  }
}
