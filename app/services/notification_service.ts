import User from '#models/user'
import transmit from '@adonisjs/transmit/services/main'

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  TEAM_INVITE = 'TEAM_INVITE'
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
    teamId: number
    teamName: string
    teamImage: string
    inviterId: number
    inviterName: string
    inviterImage: string
    type: NotificationType
}

type MessageTypes = NotificationMessage | NotificationTeamInvite | ChatMessage

export class NotificationService {
  public async sendNotification(channel: string, message: MessageTypes) {
    try {
      await transmit.broadcast(channel, { ...message })
    } catch (error) {
        throw error
    }
  }
}