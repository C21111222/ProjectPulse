import Team from '#models/team'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { NotificationType } from '#services/notification_service'
import logger from '@adonisjs/core/services/logger'

export default class TeamService {
  public async getTeamById(teamId: number): Promise<Team | null> {
    return await Team.find(teamId)
  }

  public async getUserRoleInTeam(teamId: number, userId: number): Promise<string | null> {
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .select('role')
      .first()

    return role?.role || null
  }

  public async getTeamMembers(teamId: number) {
    const res = await db
      .query()
      .from('users')
      .join('user_teams', 'users.id', 'user_teams.user_id')
      .where('user_teams.team_id', teamId)
      .select('users.id', 'users.full_name', 'users.email', 'users.image_url', 'user_teams.role')
    return res
  }

  public async getAvailableUsers(teamId: number, excludeUserIds: number[]) {
    const invitedUserIds = await db
      .from('notifications')
      .where('team_id', teamId)
      .where('type', NotificationType.TEAM_INVITE)
      .select('invitee_id')

    const users = await db
      .from('users')
      .whereNotIn('id', excludeUserIds)
      .whereNotIn(
        'id',
        invitedUserIds.map((invitedUser) => invitedUser.invitee_id)
      )
      .andWhere('id', '!=', 999999)
      .select('id', 'full_name', 'email', 'image_url')
    return users
  }
}
