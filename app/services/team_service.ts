import Team from '#models/team';
import User from '#models/user';
import db from '@adonisjs/lucid/services/db'
import {
  NotificationType
} from '#services/notification_service'

export default class TeamService {
  public async getTeamById(teamId: number): Promise<Team | null> {
    return await Team.find(teamId);
  }

  public async getUserRoleInTeam(teamId: number, userId: number): Promise<string | null> {
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', userId)
      .select('role')
      .first();

    return role?.role || null;
  }

  public async getTeamMembers(teamId: number) {
    return await User.query()
      .join('user_teams', 'users.id', 'user_teams.user_id')
      .where('user_teams.team_id', teamId)
      .select('users.id', 'users.full_name', 'users.email', 'user_teams.role', 'users.image_url');
  }

  public async getAvailableUsers(teamId: number, excludeUserIds: number[]) {
    const invitedUserIds = await db
      .from('notifications')
      .where('team_id', teamId)
      .where('type', NotificationType.TEAM_INVITE)
      .select('invitee_id');
    return await User.query()
      .whereNotIn('id', excludeUserIds)
        .whereNotIn('id', invitedUserIds.map((u) => u.invitee_id))
      .select('id', 'full_name', 'email', 'image_url');
  }
}
