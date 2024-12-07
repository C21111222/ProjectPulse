// import type { HttpContext } from '@adonisjs/core/http'
import Team from '#models/team'
import User from '#models/user'
import Notification from '#models/notification'
import { NotificationTeamInvite, NotificationService, NotificationType, NotificationTeamInviteResponse } from '#services/notification_service'
import db from '@adonisjs/lucid/services/db'

enum Role {
    Admin = 'admin',
    Manager = 'manager',
    Member = 'member'
}

export default class TeamsController {

    private notificationService = new NotificationService()

    public async create({ view }) {
        return view.render('pages/create_team')
      }
    
    public async store({ request, response, auth }) {
        const data = request.only(['name', 'description', 'imageUrl'])
        const team = new Team()
        team.name = data.name
        team.description = data.description
        team.imageUrl = data.imageUrl

        const user = await User.find(auth.user.id)
        if (!user) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        await team.save()
        // on ajoute l'utilisateur qui a créé l'équipe en tant qu'admin
        await team.related('users').attach([auth.user.id])
        await team.related('users').pivotQuery().where('user_id', auth.user.id).update({role: Role.Admin})
        await user.related('teams').attach([team.id])
        await user.related('teams').pivotQuery().where('team_id', team.id).update({role: Role.Admin})
        return response.redirect('/dashboard')
    }

    async createTeam({ auth, request, response }) {
        const teamData = request.only(['name', 'description', 'imageUrl'])
        // on verifie si une equipe avec le meme nom existe deja
        const teamExist = await Team.findBy('name', teamData.name)
        if(teamExist) {
            return response.status(409).json({message : 'Cette équipe existe déjà'})
        }
        const team = await Team.create({name : teamData.name, description : teamData.description, imageUrl : teamData.imageUrl})
        try {
            await this.addMember(auth.user.id, team.id, Role.Admin)
        } catch (error) {
            return response.status(500).json({message : 'Impossible de créer l\'équipe' + error.message})
        }
        return response.json(team)
    }

    private async addMember(userId: number, teamId: number, role: Role   ): Promise<boolean> {
        const team = await Team.find(teamId)
        if (!team) {
            throw new Error('Team not found')
        }
        const user = await User.find(userId)
        if (!user) {
            throw new Error('User not found')
        }
        try {
            await team.related('users').attach([user.id])
            await user.related('teams').attach([team.id])
            await team.related('users').pivotQuery().where('user_id', user.id).update({role: role})
            await user.related('teams').pivotQuery().where('team_id', team.id).update({role: role})
            return true
        } catch (error) {
            throw error
        }
    }

    async sendInvitation({ auth, request, response }) {
        const { teamId, userId } = request.only(['teamId', 'userId'])
        // on verifie que l'utilisateur qui envoie la requete est bien admin ou manager de l'equipe

        const user = await User.find(auth.user.id)
        if (!user) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        // on recupere le role de l'utilisateur dans l'equipe qui se trouve dans le pivot
        const role = await db.from('user_teams').where('team_id', teamId).where('user_id', user.id).select('role').first()
        if (!role) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        if (role !== Role.Admin && role !== Role.Manager) {
            return response.status(403).json({message: 'Vous n\'avez pas les droits pour effectuer cette action'})
        }

        const team = await Team.find(teamId)
        const notification: NotificationTeamInvite = {
            teamId: teamId,
            teamName: team!.name,
            teamImage: team!.imageUrl,
            inviterId: auth.user.id,
            inviterName: auth.user.fullName,
            inviterImage: auth.user.imageUrl,
            type: NotificationType.TEAM_INVITE
        }
        const channel = `notifications/${userId}`
        try {
            await this.notificationService.sendNotification(channel, notification)
            await Notification.create({teamId: teamId, inviterId: auth.user.id, inviteeId: userId, type: NotificationType.TEAM_INVITE})
            return response.json({message: 'Invitation envoyée'})
        } catch (error) {
            return response.status(500).json({message: 'Impossible d\'envoyer l\'invitation'})
        }
        
    }

    async acceptInvitation({ auth, request, response }) {
        const { teamId } = request.only(['teamId'])
        const user = await User.find(auth.user.id)
        if (!user) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        try {
            await this.addMember(user.id, teamId, Role.Member)
            // on envoie une notification à tous les membres de l'équipe pour les informer de l'arrivée du nouveau membre
            const team = await Team.find(teamId)
            if (!team) {
                return response.status(404).json({message: 'Equipe non trouvée'})
            }
            const notification: NotificationTeamInviteResponse = {
                teamId: teamId,
                teamName: team.name,
                teamImage: team.imageUrl,
                inviterId: user.id,
                inviterName: user.fullName || '',
                inviterImage: user.imageUrl,
                inviteeId: auth.user.id,
                inviteeName: auth.user.fullName || '',
                inviteeImage: auth.user.imageUrl,
                type: NotificationType.TEAM_INVITE_ACCEPTED
            }
            const channel = `teams/${teamId}`
            await this.notificationService.sendNotification(channel, notification)
            await Notification.create({teamId: teamId, inviterId: user.id, inviteeId: auth.user.id, type: NotificationType.TEAM_INVITE_ACCEPTED})
            return response.json({message: 'Invitation acceptée'})
        } catch (error) {
            return response.status(500).json({message: 'Impossible d\'accepter l\'invitation'})
        }
    }

    async declineInvitation({ auth, request, response }) {
        const { teamId } = request.only(['teamId'])
        const user = await User.find(auth.user.id)
        if (!user) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        const team = await Team.find(teamId)
        if (!team) {
            return response.status(404).json({message: 'Equipe non trouvée'})
        }
        // on envoie une notification à tous les membres de l'équipe pour les informer du refus de l'invitation
        const notification: NotificationTeamInviteResponse = {
            teamId: teamId,
            teamName: team.name,
            teamImage: team.imageUrl,
            inviterId: user.id,
            inviterName: user.fullName || '',
            inviterImage: user.imageUrl,
            inviteeId: auth.user.id,
            inviteeName: auth.user.fullName || '',
            inviteeImage: auth.user.imageUrl,
            type: NotificationType.TEAM_INVITE_DECLINED
        }
        const channel = `teams/${teamId}`
        try {
            await this.notificationService.sendNotification(channel, notification)
            await Notification.create({teamId: teamId, inviterId: user.id, inviteeId: auth.user.id, type: NotificationType.TEAM_INVITE_DECLINED})
            return response.json({message: 'Invitation refusée'})
        } catch (error) {
            return response.status(500).json({message: 'Impossible de refuser l\'invitation'})
        }
    }

    async deleteFromTeam({ auth, request, response }) {
        const { teamId, userId } = request.only(['teamId', 'userId'])
        // on verifie que l'utilisateur qui envoie la requete est bien admin ou manager de l'equipe

        const user = await User.find(auth.user.id)
        if (!user) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        // on recupere le role de l'utilisateur dans l'equipe qui se trouve dans le pivot
        const role = await db.from('user_teams').where('team_id', teamId).where('user_id', user.id).select('role').first()
        if (!role) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        if (role !== Role.Admin && role !== Role.Manager) {
            return response.status(403).json({message: 'Vous n\'avez pas les droits pour effectuer cette action'})
        }
        // on verifie que l'utilisateur que l'on veut supprimer est bien dans l'equipe et qu'il est en dessous du role de l'utilisateur qui envoie la requete
        const userRole = await db.from('user_teams').where('team_id', teamId).where('user_id', userId).select('role').first()
        if (!userRole) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        if (userRole === Role.Admin) {
            return response.status(403).json({message: 'Vous ne pouvez pas supprimer un administrateur de l\'équipe'})
        } else if (userRole === Role.Manager && role !== Role.Admin) {
            return response.status(403).json({message: 'Vous ne pouvez pas supprimer un manager de l\'équipe'})
        }

        const team = await Team.find(teamId)
        if (!team) {
            return response.status(404).json({message: 'Equipe non trouvée'})
        }
        try {
            await team.related('users').detach([userId])
            const user = await User.find(userId)
            if (!user) {
                return response.status(404).json({message: 'Utilisateur non trouvé'})
            }
            await user.related('teams').detach([teamId])
            // on envoie une notification à l'utilisateur pour l'informer qu'il a été supprimé de l'équipe
            const notification: NotificationTeamInviteResponse = {
                teamId: teamId,
                teamName: team.name,
                teamImage: team.imageUrl,
                inviterId: auth.user.id,
                inviterName: auth.user.fullName || '',
                inviterImage: auth.user.imageUrl,
                inviteeId: userId,
                inviteeName: user.fullName || '',
                inviteeImage: user.imageUrl,
                type: NotificationType.TEAM_BANNED
            }
            const channel = `notifications/${userId}`
            await this.notificationService.sendNotification(channel, notification)
            return response.json({message: 'Utilisateur supprimé de l\'équipe'})
        } catch (error) {
            return response.status(500).json({message: 'Impossible de supprimer l\'utilisateur de l\'équipe'})
        }
    }

    async promoteUser({ auth, request, response }) {
        const { teamId, userId } = request.only(['teamId', 'userId'])
        // on verifie que l'utilisateur qui envoie la requete est bien admin de l'equipe

        const user = await User.find(auth.user.id)
        if (!user) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        // on recupere le role de l'utilisateur dans l'equipe qui se trouve dans le pivot
        const role = await db.from('user_teams').where('team_id', teamId).where('user_id', user.id).select('role').first()
        if (!role) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        if (role !== Role.Admin) {
            return response.status(403).json({message: 'Vous n\'avez pas les droits pour effectuer cette action'})
        }
        // on verifie que l'utilisateur que l'on veut promouvoir est bien dans l'equipe et qu'il est en dessous du role de l'utilisateur qui envoie la requete
        const userRole = await db.from('user_teams').where('team_id', teamId).where('user_id', userId).select('role').first()
        if (!userRole) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        if (userRole === Role.Admin) {
            return response.status(403).json({message: 'Vous ne pouvez pas promouvoir un administrateur de l\'équipe'})
        }

        const team = await Team.find(teamId)
        if (!team) {
            return response.status(404).json({message: 'Equipe non trouvée'})
        }
        // si l'utilisateur est deja manager on le promouvoit admin
        if (userRole === Role.Manager) {
            try {
                await team.related('users').pivotQuery().where('user_id', userId).update({role: Role.Admin})
                await user.related('teams').pivotQuery().where('team_id', teamId).update({role: Role.Admin})
                return response.json({message: 'Utilisateur promu admin'})
            } catch (error) {
                return response.status(500).json({message: 'Impossible de promouvoir l\'utilisateur'})
            }
        }

        // si l'utilisateur est membre on le promouvoit manager
        try {
            await team.related('users').pivotQuery().where('user_id', userId).update({role: Role.Manager})
            await user.related('teams').pivotQuery().where('team_id', teamId).update({role: Role.Manager})
            return response.json({message: 'Utilisateur promu manager'})
        } catch (error) {
            return response.status(500).json({message: 'Impossible de promouvoir l\'utilisateur'})
        }
    }

    async demoteUser({ auth, request, response }) {
        const { teamId, userId } = request.only(['teamId', 'userId'])
        // on verifie que l'utilisateur qui envoie la requete est bien admin de l'equipe

        const user = await User.find(auth.user.id)
        if (!user) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        // on recupere le role de l'utilisateur dans l'equipe qui se trouve dans le pivot
        const role = await db.from('user_teams').where('team_id', teamId).where('user_id', user.id).select('role').first()
        if (!role) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        if (role !== Role.Admin) {
            return response.status(403).json({message: 'Vous n\'avez pas les droits pour effectuer cette action'})
        }
        // on verifie que l'utilisateur que l'on veut promouvoir est bien dans l'equipe et qu'il est en dessous du role de l'utilisateur qui envoie la requete
        const userRole = await db.from('user_teams').where('team_id', teamId).where('user_id', userId).select('role').first()
        if (!userRole) {
            return response.status(404).json({message: 'Utilisateur non trouvé'})
        }
        if (userRole === Role.Admin) {
            return response.status(403).json({message: 'Vous ne pouvez pas rétrograder un administrateur de l\'équipe'})
        }
        const team = await Team.find(teamId)
        if (!team) {
            return response.status(404).json({message : 'Equipe non trouvée'})
        }
        // si l'utilisateur est manager on le retrograde membre
        if (userRole === Role.Manager) {
            try {
                await team.related('users').pivotQuery().where('user_id', userId).update({role: Role.Member})
                await user.related('teams').pivotQuery().where('team_id', teamId).update({role: Role.Member})
                return response.json({message: 'Utilisateur retrogradé membre'})
            } catch (error) {
                return response.status(500).json({message: 'Impossible de rétrograder l\'utilisateur'})
            }
        }
    }

}