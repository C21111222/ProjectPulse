// import type { HttpContext } from '@adonisjs/core/http'

import User from "#models/user";
import Notification from "#models/notification";

export default class NotificationsController {

    async getNotifications({ auth, response }) {
        const user = await User.find(auth.user.id)
        if (!user) {
            return response.status(404).json({ message: 'User not found' })
        }
        const notifications = await Notification.query().where('invitee_id', user.id).preload('inviter').preload('team')
        const formattedNotifications = notifications.map(notification => ({
            teamId: notification.team.id,
            teamName: notification.team.name,
            teamImage: notification.team.imageUrl,
            inviterId: notification.inviter.id,
            inviterName: notification.inviter.fullName || '',
            inviterImage: notification.inviter.imageUrl,
            inviteeId: user.id,
            inviteeName: user.fullName || '',
            inviteeImage: user.imageUrl,
            type: notification.type
        }))
        // on recuoere maintenant les messafes non lus
        const unreadMessages = await user.getUnreadMessages() 
        // on les ajoute aux notifications, sans les formatter
        const result = { notifications: formattedNotifications, messages : unreadMessages }


        return response.status(200).json(result)
    }

    async deleteNotification({ auth, params, response }) {
        const user = await User.find(auth.user.id)
        if(!user) {
            return response.status(404).json({ message: 'User not found' })
        }
        const notification = await Notification.query().where('id', params.id).where('invitee_id', user.id).first()
        if(!notification) {
            return response.status(404).json({ message: 'Notification not found' })
        }
        await notification.delete()
        return response.status(204).send()
    }
}