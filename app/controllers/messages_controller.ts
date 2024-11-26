// import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Message from '#models/message'
import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'

export default class MessageriesController {
  /**
   * Handles the index action for the messages controller.
   *
   * @param {Object} ctx - The context object.
   * @param {Object} ctx.auth - The authentication object containing the authenticated user.
   * @param {Object} ctx.view - The view object used to render the response.
   *
   * @returns {Promise<Object>} The rendered view of the chat page with the list of users.
   *
   * @description
   * This method retrieves all users and filters out the authenticated user and a global user with a specific ID (999999).
   * It then renders the chat page with the remaining users.
   */
  async index({ auth, view }) {
    const users = await User.getAllUsers()
    const authUser = users.find((user) => user.id === auth.user.id)
    const globalUser = users.find((user) => user.id === 999999)
    if (authUser) {
      users.splice(users.indexOf(authUser), 1)
    }
    if (globalUser) {
      users.splice(users.indexOf(globalUser), 1)
    }
    return view.render('pages/chat', { users: users.map((user) => user.serialize()) })
  }

  /**
   * Retrieves the message history between the authenticated user and a specified receiver.
   *
   * @param {Object} context - The context object containing auth, request, and response.
   * @param {Object} context.auth - The authentication object containing the authenticated user.
   * @param {Object} context.request - The request object containing the input data.
   * @param {Object} context.response - The response object used to send back the HTTP response.
   *
   * @returns {Promise<void>} - A promise that resolves with the message history.
   */
  async getHistory({ auth, request, response }) {
    logger.info('getHistory')
    logger.info(auth.user.id)
    logger.info(request.all())
    const receiverId = request.input('receiver_id')
    if (receiverId == 999999) {
      const messages = await Message.query()
        .where((query) => {
          query.where('channel_id', 'global')
        })
        .orderBy('created_at', 'asc')
        .exec()
      return response.json(messages)
    }
    const receiver = await User.find(receiverId)
    if (!receiver) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    const messages = await Message.query()
      .where((query) => {
        query.where('sender_id', auth.user.id).andWhere('receiver_id', receiverId)
      })
      .orWhere((query) => {
        query.where('sender_id', receiverId).andWhere('receiver_id', auth.user.id)
      })
      .orderBy('created_at', 'asc')
      .exec()
    return response.json(messages)
  }

  /**
   * Sends a message from the authenticated user to a specified receiver.
   *
   * @param {Object} context - The context object containing auth, request, response, and session.
   * @param {Object} context.auth - The authentication object containing the authenticated user.
   * @param {Object} context.request - The request object containing the input data.
   * @param {Object} context.response - The response object used to send back the HTTP response.
   * @param {Object} context.session - The session object.
   *
   * @returns {Promise<void>} - A promise that resolves when the message is sent.
   *
   * @throws {Error} - Throws an error if there is an issue saving the message or broadcasting it.
   */
  async sendMessage({ auth, request, response, session }) {
    const receiverId = request.input('receiver_id')
    const message = request.input('content')
    logger.info('sendMessage')
    logger.info(receiverId)
    if (receiverId == 999999) {
      const newMessage = new Message()
      newMessage.senderId = auth.user.id
      newMessage.receiverId = 999999
      newMessage.content = message
      newMessage.channelId = 'global'
      newMessage.senderName = auth.user.fullName
      try {
        transmit.broadcast('chats/global/messages', {
          message: message,
          sender: auth.user.id,
          senderName: auth.user.fullName,
          createdAt: Date.now(),
        })
        await newMessage.save()
      } catch (error) {
        logger.error(error)
        return response.status(500).json({ message: "Erreur lors de l'envoi du message" })
      }
    }
    const receiver = await User.find(receiverId)
    if (!receiver) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    const newMessage = new Message()
    newMessage.senderId = auth.user.id
    newMessage.receiverId = receiverId
    newMessage.content = message
    const channel =
      auth.user.id < receiverId ? `${auth.user.id}-${receiverId}` : `${receiverId}-${auth.user.id}`
    newMessage.channelId = channel
    logger.info(channel)
    try {
      transmit.broadcast(`chats/${channel}/messages`, { message: message, sender: auth.user.id, senderName: auth.user.fullName, createdAt: Date.now() })
      await newMessage.save()
    } catch (error) {
      return response.status(500).json({ message: "Erreur lors de l'envoi du message" })
    }
    return response.json({ message: 'Message envoyé' })
  }
}
