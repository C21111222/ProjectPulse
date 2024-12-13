import db from '@adonisjs/lucid/services/db'
import transmit from '@adonisjs/transmit/services/main'
import Team from '#models/team'
import User from '#models/user'
import Notification from '#models/notification'
import logger from '@adonisjs/core/services/logger'

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  TEAM_INVITE = 'TEAM_INVITE',
  TEAM_INVITE_ACCEPTED = 'TEAM_INVITE_ACCEPTED',
  TEAM_INVITE_DECLINED = 'TEAM_INVITE_DECLINED',
  TEAM_BANNED = 'TEAM_BANNED',
}
export interface ChatMessage {
  message: string
  sender: number
  senderName: string
  createdAt: number
  messageId: number
  senderImage: string
}

export interface NotificationMessage {
  message: string
  senderId: number
  senderName: string
  channelId: string
  messageViewed: boolean
  senderImage: string
  type: NotificationType
}

export interface NotificationTeamInvite {
  notificationId: number
  teamId: number
  teamName: string
  teamImage: string
  inviterId: number
  inviterName: string
  inviterImage: string
  type: NotificationType
}

export interface NotificationTeamInviteResponse {
  notificationId: number
  teamId: number
  teamName: string
  teamImage: string
  inviterId: number
  inviterName: string
  inviterImage: string
  inviteeId: number
  inviteeName: string
  inviteeImage: string
  type: NotificationType
}

type MessageTypes =
  | NotificationMessage
  | NotificationTeamInvite
  | ChatMessage
  | NotificationTeamInviteResponse

export class NotificationService {
  public static async sendNotification(channel: string, message: MessageTypes) {
    logger.info('Sending notification to channel ' + channel)
    try {
      await transmit.broadcast(channel, { ...message })
    } catch (error) {
      throw error
    }
  }

  public static async getNotificationsForUser(userId: number): Promise<Notification[]> {
    return Notification.query()
      .where('invitee_id', userId)
      .preload('inviter')
      .preload('team')
  }

  public static async deleteNotificationForUser(notificationId: number, userId: number): Promise<boolean> {
    const notification = await Notification.query()
      .where('id', notificationId)
      .where('invitee_id', userId)
      .first()
    if (!notification) {
      return false
    }
    await notification.delete()
    return true
  }

  public static async createTeamBannedNotification(
    teamId: number,
    inviterId: number,
    inviteeId: number,
    teamName: string,
    teamImage: string,
    inviterName: string,
    inviterImage: string,
    inviteeName: string,
    inviteeImage: string
  ): Promise<NotificationTeamInviteResponse> {
    const notif = await Notification.create({
      teamId: teamId,
      inviterId: inviterId,
      inviteeId: inviteeId,
      type: NotificationType.TEAM_BANNED,
    })
    return {
      notificationId: notif.id,
      teamId: teamId,
      teamName: teamName,
      teamImage: teamImage,
      inviterId: inviterId,
      inviterName: inviterName,
      inviterImage: inviterImage,
      inviteeId: inviteeId,
      inviteeName: inviteeName,
      inviteeImage: inviteeImage,
      type: NotificationType.TEAM_BANNED,
    }
  }

  public static async sendTeamNotification(teamid: number, message: MessageTypes) {
    // on envoie la notification à chaque membre
    const team = await Team.find(teamid)
    if (!team) {
      return
    }
    const members = await db.from('user_teams').where('team_id', teamid).select('user_id')
    logger.info('Sending notification to team members')
    logger.info(members)
    members.forEach(async (member) => {
      try {
        const channel = `notifications/${member.user_id}`
        await transmit.broadcast(channel, { ...message })
        if ('inviteeId' in message && member.user_id !== message.inviteeId) {
          // on l'ajoute à la base de données
          const notification = new Notification()
          if ('inviterId' in message) {
            notification.inviterId = message.inviterId
          }
          notification.inviteeId = member.user_id
          notification.teamId = teamid
          if ('type' in message) {
            notification.type = message.type as
              | 'TEAM_INVITE'
              | 'TEAM_INVITE_ACCEPTED'
              | 'TEAM_INVITE_DECLINED'
              | 'TEAM_BANNED'
          }
          logger.info('Saving notification')
          await notification.save()
        }
      } catch (error) {
        throw error
      }
    })
  }

  static async deleteNotification2(userId: number, notificationId: number) {
    const user = await User.find(userId)
    if (!user) {
      throw new Error('User not found')
    }
    const notification = db
      .from('notifications')
      .where('id', notificationId)
      .where('invitee_id', userId)
      .delete()
    if (!notification) {
      throw new Error('Notification not found')
    }
    return 'Notification deleted'
  }
}
