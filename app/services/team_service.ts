import Team from '#models/team'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { NotificationType } from '#services/notification_service'

type Role = 'admin' | 'manager' | 'member'

export default class TeamService {
  public static async getTeamById(teamId: number): Promise<Team | null> {
    return await Team.find(teamId)
  }

  public static async promoteUserInTeam(
    userId: number,
    teamId: number,
    newRole: string
  ): Promise<void> {
    await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .update({ role: newRole })
  }

  public static async demoteUserInTeam(
    userId: number,
    teamId: number,
    newRole: string
  ): Promise<void> {
    await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .update({ role: newRole })
  }
  public static async isUserAdminOrManagerOfTeam(userId: number, teamId: number): Promise<boolean> {
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .select('role')
      .first()
    return role && (role.role === 'admin' || role.role === 'manager')
  }

  public static async isUserMemberOfTeam(userId: number, teamId: number): Promise<boolean> {
    const team = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .first()
    return !!team
  }

  public static async deleteTeam(teamId: number): Promise<void> {
    await db.from('teams').where('id', teamId).delete()
  }

  public static async getTeamMembers(teamId: number): Promise<{ user_id: number; role: string }[]> {
    return db.from('user_teams').join('users', 'users.id', 'user_teams.user_id').where('team_id', teamId).select('user_id', 'full_name', 'role')
  }

  public static async getUserRoleInTeam(teamId: number, userId: number): Promise<string | null> {
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

  static async addMember(userId: number, teamId: number, role: Role): Promise<boolean> {
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
      return true
    } catch (error) {
      throw error
    }
  }

  public static async getAvailableUsers(teamId: number, excludeUserIds: number[]) {
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

  public static async removeUserFromTeam(userId: number, teamId: number): Promise<void> {
    const user = await User.findOrFail(userId)
    await user.related('teams').detach([teamId])
  }

  public static async isUserAdminOfTeam(userId: number, teamId: number): Promise<boolean> {
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .select('role')
      .first()
    return role && role.role === 'admin'
  }
}
