// import type { HttpContext } from '@adonisjs/core/http'
import Team from '#models/team'
import User from '#models/user'
import { NotificationTeamInvite, NotificationService, NotificationType } from '#services/notification_service'
import db from '@adonisjs/lucid/services/db'

enum Role {
    Admin = 'admin',
    Manager = 'manager',
    Member = 'member'
}

export default class TeamsController {

    private notificationService = new NotificationService()

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
            return response.json({message: 'Invitation envoyée'})
        } catch (error) {
            return response.status(500).json({message: 'Impossible d\'envoyer l\'invitation'})
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
            return response.json({message: 'Utilisateur supprimé de l\'équipe'})
        } catch (error) {
            return response.status(500).json({message: 'Impossible de supprimer l\'utilisateur de l\'équipe'})
        }
    }




}