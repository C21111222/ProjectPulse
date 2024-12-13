import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import UserService from '#services/user_service'
import { NotificationService } from '#services/notification_service'

export default class NotificationsController {
  /**
   * Retrieves notifications and unread messages for the authenticated user.
   *
   * @param {HttpContext} context - The HTTP context containing the authentication and response objects.
   * @param {object} context.auth - The authentication object containing user information.
   * @param {object} context.response - The response object used to send the HTTP response.
   * @returns {Promise<void>} - A promise that resolves to void. The response object is used to send the result.
   *
   * @throws {Error} If the user is not authenticated, responds with a 401 status and an 'Unauthorized' message.
   * @throws {Error} If the user is not found, responds with a 404 status and a 'User not found' message.
   */
  async getNotifications({ auth, response }: HttpContext) {
    if (!auth.user) {
      return response.status(401).json({ message: 'Unauthorized' })
    }
    const user = await UserService.getUserById(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'User not found' })
    }

    const notifications = await NotificationService.getNotificationsForUser(user.id)
    const formattedNotifications = notifications.map((notification) => ({
      notificationId: notification.id,
      teamId: notification.team.id,
      teamName: notification.team.name,
      teamImage: notification.team.imageUrl,
      inviterId: notification.inviter.id,
      inviterName: notification.inviter.fullName || '',
      inviterImage: notification.inviter.imageUrl,
      inviteeId: user.id,
      inviteeName: user.fullName || '',
      inviteeImage: user.imageUrl,
      type: notification.type,
    }))

    const unreadMessages = await UserService.getUnreadMessages(user)
    const result = { notifications: formattedNotifications, messages: unreadMessages }

    return response.status(200).json(result)
  }

  /**
   * Deletes a notification for the authenticated user.
   *
   * @param {HttpContext} context - The HTTP context containing the authenticated user, request parameters, and response object.
   * @returns {Promise<void>} - A promise that resolves to void.
   *
   * @throws {Error} - Throws an error if the user is not authenticated or if the user or notification is not found.
   */
  async deleteNotification({ auth, params, response }: HttpContext) {
    logger.info('Deleting notification')
    if (!auth.user) {
      return response.status(401).json({ message: 'Unauthorized' })
    }
    const user = await UserService.getUserById(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'User not found' })
    }

    const success = await NotificationService.deleteNotificationForUser(params.id, user.id)
    if (!success) {
      return response.status(404).json({ message: 'Notification not found' })
    }

    logger.info('Notification deleted')
    return response.ok({ message: 'Notification deleted' })
  }
}