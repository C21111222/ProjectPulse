import type { HttpContext } from '@adonisjs/core/http'
import Team from '#models/team'
import User from '#models/user'
import Notification from '#models/notification'
import {
  NotificationTeamInvite,
  NotificationService,
  NotificationType,
  NotificationTeamInviteResponse,
} from '#services/notification_service'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'

enum Role {
  Admin = 'admin',
  Manager = 'manager',
  Member = 'member',
}

export default class TeamsController {
  private notificationService = new NotificationService()

  public async create({ view } : HttpContext) {
    return view.render('pages/create_team')
  }

  public async dashboardTeam({ view, auth, params, response } : HttpContext) {
    logger.info('Dashboard team')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const user = await User.find(auth.user.id)
    if (!user) {
      return view.render('pages/dashboard', { teams: [] })
    }
    // o nrecupere l'id sachant que la route est /team/:id
    const teamId = params.id
    const team = await Team.find(teamId)
    if (!team) {
      return response.status(404).json({ message: 'Equipe non trouvée' })
    }
    // o nrecupere le role de l'utilisateur dans l'equipe
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', user.id)
      .select('role')
      .first()
    if (!role) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    // on charge tous les utilisateurs de l'equipe sauf l'utilisateur actuel
    logger.info(teamId)
    const members = await db
      .from('user_teams')
      .where('team_id', teamId)
      .andWhere('user_id', '!=', user.id)
      .select('user_id', 'role')
    // on charge les utilisateurs de l'equipe
    const usersMembers = await db
      .from('users')
      .join('user_teams', 'users.id', 'user_teams.user_id')
      .where('user_teams.team_id', teamId)
      .andWhere('users.id', '!=', 999999)
      .select('users.id', 'users.full_name', 'users.email', 'user_teams.role', 'users.image_url')
    // on charge tous les utilisateurs du site qui ne sont pas dans l'equipe
    logger.info('selecting users')
    const users = await db
      .from('users')
      .whereNotIn(
        'id',
        members.map((member) => member.user_id)
      )
      .andWhere('id', '!=', 999999)
      .andWhere('id', '!=', user.id)
      .select('id', 'full_name', 'email', 'image_url')

    logger.info(users)
    logger.info(usersMembers)
    // s'il est admin on renvoie la vue avec le role admin
    if (role.role === Role.Admin || role.role === Role.Manager) {
      return view.render('pages/dashboard_team_admin', {
        team: team,
        members: usersMembers,
        users: users,
      })
    }

    // s'il est membre on renvoie la vue avec le role member

    return view.render('pages/dashboard_team_member', {
      team: team,
      members: usersMembers,
      users: users,
    })
  }


  async createTeam({ auth, request, response } : HttpContext) {
    logger.info('Creating team')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const teamData = request.only([
      'name',
      'description',
      'imageUrl',
      'status',
      'start_date',
      'end_date',
    ])
    logger.info(teamData)
    // on verifie si une equipe avec le meme nom existe deja
    const teamExist = await Team.findBy('name', teamData.name)
    if (teamExist) {
      return response.status(409).json({ message: 'Cette équipe existe déjà' })
    }
    const team = await Team.create({
      name: teamData.name,
      description: teamData.description,
      imageUrl: teamData.imageUrl,
      status: teamData.status,
      startDate: teamData.start_date,
      endDate: teamData.end_date,
    })
    try {
      await this.addMember(auth.user.id, team.id, Role.Admin)
    } catch (error) {
      return response.status(500).json({ message: "Impossible de créer l'équipe" + error.message })
    }
    return response.json(team)
  }

  async changeStatus({ auth, request, response } : HttpContext) {
    logger.info('Changing status')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const teamId = request.input('teamId')
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
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

  private async addMember(userId: number, teamId: number, role: Role): Promise<boolean> {
    const team = await Team.find(teamId)
    if (!team) {
      throw new Error('Team not found')
    }
    const user = await User.find(userId)
    if (!user) {
      throw new Error('User not found')
    }
    try {
      await user.related('teams').attach([team.id])
      await user.related('teams').pivotQuery().where('team_id', team.id).update({ role: role })
      logger.info('User added to team')
      return true
    } catch (error) {
      throw error
    }
  }

  async sendInvitation({ auth, request, response } :HttpContext) {
    logger.info('Sending invitation')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const { teamId, userId } = request.only(['teamId', 'userId'])
    // on verifie que l'utilisateur qui envoie la requete est bien admin ou manager de l'equipe

    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    logger.info('User found')
    // on recupere le role de l'utilisateur dans l'equipe qui se trouve dans le pivot
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', user.id)
      .select('role')
      .first()
    if (!role) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    logger.info('Role found')
    if (role.role !== 'admin' && role.role !== 'manager') {
      logger.info('Role is member')
      return response
        .status(403)
        .json({ message: "Vous n'avez pas les droits pour effectuer cette action" })
    }
    logger.info('Role is admin or manager')

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
      await this.notificationService.sendNotification(`notifications/${userId}`, notification)
      logger.info('Invitation sent')
      return response.ok(JSON.stringify({ message: 'Invitation envoyée' }))
    } catch (error) {
      logger.error('Error sending invitation %s', error)
      return response.status(500).json({ message: "Impossible d'envoyer l'invitation" })
    }
  }

  async acceptInvitation({ auth, params, response } :HttpContext) {
    logger.info('Accepting invitation')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const notification1 = await Notification.query()
      .where('id', params.id)
      .where('invitee_id', auth.user.id)
      .first()
    if (!notification1) {
      return response.status(404).json({ message: 'Notification not found' })
    }
    const teamId = notification1.teamId
    logger.info('Team id %s', teamId)
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    try {
      await this.addMember(user.id, teamId, Role.Member)
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

      await this.notificationService.sendTeamNotification(teamId, notification)
      // on supprime la notification d'invitation
      await notification1.delete()
      return response.ok(JSON.stringify({ message: 'Invitation acceptée' }))
    } catch (error) {
      logger.error('Error accepting invitation %s', error)
      return response.status(500).json({ message: "Impossible d'accepter l'invitation" })
    }
  }

  async declineInvitation({ auth, request, response } :HttpContext) {
    logger.info('Declining invitation')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
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
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
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
      await this.notificationService.sendTeamNotification(teamId, notification)
      // on supprime la notification d'invitation
      await notification1.delete()
      logger.info('Invitation declined')
      return response.ok(JSON.stringify({ message: 'Invitation refusée' }))
    } catch (error) {
      logger.error('Error declining invitation %s', error)
      return response.status(500).json({ message: "Impossible de refuser l'invitation" })
    }
  }

  async deleteFromTeam({ auth, request, response } :HttpContext) {
    logger.info('Deleting from team')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const teamId = request.input('teamId')
    const userId = request.input('userId')
    console.log(request.all())
    // on verifie que l'utilisateur qui envoie la requete est bien admin ou manager de l'equipe

    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    logger.info('User found')
    // on recupere le role de l'utilisateur dans l'equipe qui se trouve dans le pivot
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', user.id)
      .select('role')
      .first()
    if (!role) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    if (role.role !== Role.Admin && role.role !== Role.Manager) {
      return response
        .status(403)
        .json({ message: "Vous n'avez pas les droits pour effectuer cette action" })
    }
    logger.info('Role found')
    // on verifie que l'utilisateur que l'on veut supprimer est bien dans l'equipe et qu'il est en dessous du role de l'utilisateur qui envoie la requete
    const userRole = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .select('role')
      .first()
    if (!userRole.role) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    if (userRole.role === Role.Admin) {
      return response
        .status(403)
        .json({ message: "Vous ne pouvez pas supprimer un administrateur de l'équipe" })
    } else if (userRole.role === Role.Manager && role !== Role.Admin) {
      return response
        .status(403)
        .json({ message: "Vous ne pouvez pas supprimer un manager de l'équipe" })
    }
    logger.info('User role found2')

    const team = await Team.find(teamId)
    if (!team) {
      return response.status(404).json({ message: 'Equipe non trouvée' })
    }
    try {
      const user = await User.find(userId)
      if (!user) {
        return response.status(404).json({ message: 'Utilisateur non trouvé' })
      }
      const notif = await Notification.create({
        teamId: teamId,
        inviterId: auth.user.id,
        inviteeId: userId,
        type: NotificationType.TEAM_BANNED,
      })
      // on envoie une notification à l'utilisateur pour l'informer qu'il a été supprimé de l'équipe
      const notification: NotificationTeamInviteResponse = {
        notificationId: notif.id,
        teamId: teamId,
        teamName: team.name,
        teamImage: team.imageUrl,
        inviterId: auth.user.id,
        inviterName: auth.user.fullName || '',
        inviterImage: auth.user.imageUrl,
        inviteeId: user.id,
        inviteeName: user.fullName || '',
        inviteeImage: user.imageUrl,
        type: NotificationType.TEAM_BANNED,
      }
      await this.notificationService.sendTeamNotification(teamId, notification)
      await user.related('teams').detach([teamId])
      return response.json({ message: "Utilisateur supprimé de l'équipe" })
    } catch (error) {
      logger.error('Error deleting user from team %s', error)
      return response
        .status(500)
        .json({ message: "Impossible de supprimer l'utilisateur de l'équipe" })
    }
  }

  async promoteUser({ auth, request, response } :HttpContext) {
    logger.info('Promoting user')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const { teamId, userId } = request.only(['teamId', 'userId'])
    // on verifie que l'utilisateur qui envoie la requete est bien admin de l'equipe

    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    // on recupere le role de l'utilisateur dans l'equipe qui se trouve dans le pivot
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
    // on verifie que l'utilisateur que l'on veut promouvoir est bien dans l'equipe et qu'il est en dessous du role de l'utilisateur qui envoie la requete
    const userRole = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .select('role')
      .first()
    if (!userRole) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    if (userRole.role === Role.Admin) {
      return response
        .status(403)
        .json({ message: "Vous ne pouvez pas promouvoir un administrateur de l'équipe" })
    }

    const team = await Team.find(teamId)
    const promotedUser = await User.find(userId)
    if (!promotedUser) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    if (!team) {
      return response.status(404).json({ message: 'Equipe non trouvée' })
    }
    // si l'utilisateur est deja manager on le promouvoit admin
    if (userRole.role === Role.Manager) {
      try {
        await promotedUser
          .related('teams')
          .pivotQuery()
          .where('team_id', teamId)
          .update({ role: Role.Admin })
        return response.json({ message: 'Utilisateur promu admin' })
      } catch (error) {
        return response.status(500).json({ message: "Impossible de promouvoir l'utilisateur" })
      }
    }

    // si l'utilisateur est membre on le promouvoit manager
    try {
      await promotedUser
        .related('teams')
        .pivotQuery()
        .where('team_id', teamId)
        .update({ role: Role.Manager })
      return response.json({ message: 'Utilisateur promu manager' })
    } catch (error) {
      return response.status(500).json({ message: "Impossible de promouvoir l'utilisateur" })
    }
  }

  async demoteUser({ auth, request, response } :HttpContext) {
    logger.info('Demoting user')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const { teamId, userId } = request.only(['teamId', 'userId'])
    // on verifie que l'utilisateur qui envoie la requete est bien admin de l'equipe

    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    // on recupere le role de l'utilisateur dans l'equipe qui se trouve dans le pivot
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', user.id)
      .select('role')
      .first()
    if (!role) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    logger.info(role.role)
    if (role.role !== Role.Admin) {
      return response
        .status(403)
        .json({ message: "Vous n'avez pas les droits pour effectuer cette action" })
    }
    // on verifie que l'utilisateur que l'on veut promouvoir est bien dans l'equipe et qu'il est en dessous du role de l'utilisateur qui envoie la requete
    const userRole = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .select('role')
      .first()
    if (!userRole) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    if (userRole.role === Role.Admin) {
      return response
        .status(403)
        .json({ message: "Vous ne pouvez pas rétrograder un administrateur de l'équipe" })
    }
    const team = await Team.find(teamId)
    const demotedUser = await User.find(userId)
    if (!demotedUser) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    if (!team) {
      return response.status(404).json({ message: 'Equipe non trouvée' })
    }
    // si l'utilisateur est manager on le retrograde membre
    if (userRole.role === Role.Manager) {
      try {
        await demotedUser
          .related('teams')
          .pivotQuery()
          .where('team_id', teamId)
          .update({ role: Role.Member })
        return response.json({ message: 'Utilisateur retrogradé membre' })
      } catch (error) {
        return response.status(500).json({ message: "Impossible de rétrograder l'utilisateur" })
      }
    }
    return response
      .status(500)
      .json({ message: "Impossible de rétrograder l'utilisateur, il est déjà membre" })
  }

  async getMembers({ auth, request, response } :HttpContext) {
    logger.info('Getting members')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const teamId = request.input('teamId')
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    // on verifie que l'utilisateur fait bien partie de l'equipe
    const team = await user.related('teams').query().where('team_id', teamId).first()
    if (!team) {
      return response.status(403).json({ message: "Vous n'êtes pas membre de cette équipe" })
    }
    // on recupere les membres de l'equipe
    const members = await db.from('user_teams').where('team_id', teamId).select('user_id', 'role')
    const users = []
    for (const member of members) {
      if (member.user_id === auth.user.id) {
        continue
      }
      const user = await User.find(member.user_id)
      if (user) {
        users.push({
          id: user.id,
          fullName: user.fullName,
          imageUrl: user.imageUrl,
          role: member.role,
        })
      }
    }
    return response.json(users)
  }

  async deleteTeam({ auth, request, response } :HttpContext) {
    logger.info('Deleting team')
    if (!auth.user) {
        return response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' })
    }
    const teamId = request.input('teamId')
    logger.info('Team id %s', teamId)
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
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
    // on supprime l'equipe
    await db.from('teams').where('id', teamId).delete()
    return response.json({ message: 'Equipe supprimée' })
  }
}
