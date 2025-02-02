import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Message from '#models/message'
import logger from '@adonisjs/core/services/logger'
import {
  NotificationService,
  ChatMessage,
  NotificationMessage,
  NotificationType,
} from '#services/notification_service'
import db from '@adonisjs/lucid/services/db'

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
  async index({ auth, view }: HttpContext) {
    const users = await User.query().exec()
    const authUser = users.find((user) => user.id === auth.user.id)
    const globalUser = users.find((user) => user.id === 999999)
    if (authUser) {
      users.splice(users.indexOf(authUser), 1)
    }
    if (globalUser) {
      users.splice(users.indexOf(globalUser), 1)
    }
    const resultat = []
    logger.info(users)
    // pour chaque utilisateur, on regarde le dernier message envoyé par celui ci, si il a été vu ou non, on crée un objet avec les infos de l'utilisateur et la variable messageViewed
    for (const user of users) {
      const lastMessage = await Message.query()
        .where((query) => {
          query.where('sender_id', user.id).andWhere('receiver_id', auth.user.id)
        })
        .orderBy('created_at', 'desc')
        .first()
      logger.info(user.imageUrl)
      if (lastMessage) {
        resultat.push({
          user: user.serialize(),
          image: user.imageUrl,
          messageViewed: lastMessage.viewed,
        })
      } else {
        resultat.push({ user: user.serialize(), image: user.imageUrl, messageViewed: true })
      }
    }

    return view.render('pages/chat', { users: resultat })
  }

  /**
   * Handles the retrieval and display of a single chat between the authenticated user and a specified receiver.
   * 
   * @param {Object} ctx - The context object containing the request, authentication, and view.
   * @param {Object} ctx.auth - The authentication object containing the authenticated user.
   * @param {Object} ctx.request - The request object containing the input data.
   * @param {Object} ctx.view - The view object used to render the response.
   * 
   * @returns {Promise<void>} - Renders the chat page with the messages between the authenticated user and the receiver.
   * 
   * @throws {Error} - Throws an error if the receiver is not found.
   */
  async singleChat({ auth, request, view }) {
    const receiverId = request.input('receiver_id')
    const receiver = await User.find(receiverId)
    if (!receiver) {
      return view.redirect('/chat')
    }
    const messages = await Message.query()
      .where((query) => {
        query.where('sender_id', auth.user.id).andWhere('receiver_id', receiverId)
      })
      .orWhere((query) => {
        query.where('sender_id', receiverId).andWhere('receiver_id', auth.user.id)
      })
      .preload('sender') // Charge les informations de l'utilisateur lié
      .orderBy('created_at', 'asc')
      .exec()
    logger.info(messages)
    return view.render('pages/personnalChat', { messages: messages, user: receiver.serialize() })
  }
  /**
   * Retrieves a list of users who have sent unviewed messages to the authenticated user.
   * 
   * @param {Object} context - The context object containing the authenticated user and response.
   * @param {Object} context.auth - The authentication object containing the authenticated user.
   * @param {Object} context.auth.user - The authenticated user object.h   
   * @param {Object} context.response - The response object used to send back the HTTP response.
   *
   * @returns {Promise<void>} - A promise that resolves with the list of users who have sent unviewed messages.
   * 
    * @throws {Error} - Throws an error if there is an issue retrieving the users.
    */
  async unviewedChats({ auth, response }) {
    const users = await User.query().exec()
    const authUser = users.find((user) => user.id === auth.user.id)
    const globalUser = users.find((user) => user.id === 999999)
    if (authUser) {
      users.splice(users.indexOf(authUser), 1)
    }
    if (globalUser) {
      users.splice(users.indexOf(globalUser), 1)
    }
    const resultat = []
    // pour chaque utilisateur, on regarde le dernier message envoyé par celui ci, si il a été vu ou non, on crée un objet avec les infos de l'utilisateur, on ne push que les utilisateurs qui ont envoyé un message non vu
    for (const user of users) {
      const lastMessage = await Message.query()
        .where((query) => {
          query.where('sender_id', user.id).andWhere('receiver_id', auth.user.id)
        })
        .orderBy('created_at', 'desc')
        .first()
      if (lastMessage && !lastMessage.viewed) {
        resultat.push({
          user: user.serialize(),
          image: user.imageUrl,
          messageViewed: lastMessage.viewed,
        })
      }
    }
    return response.json(resultat)
  }

  /**
   * Marks all messages from a specific sender as viewed by the authenticated user.
   *
   * @param {Object} ctx - The context object containing auth, request, and response.
   * @param {Object} ctx.auth - The authentication object containing the authenticated user.
   * @param {Object} ctx.request - The request object containing the sender_id input.
   * @param {Object} ctx.response - The response object used to send back the HTTP response.
   * @returns {Promise<void>} - A promise that resolves to void.
   *
   * @throws {Error} - Throws an error if the sender is not found or if there is an issue updating the messages.
   */
  async haveView({ auth, request, response }) {
    // on met tous les messages de la conversation en lu
    const sendId = request.input('sender_id')
    const receiver = await User.find(sendId)
    if (!receiver) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    try {
      await Message.query()
        .where((query) => {
          query.where('sender_id', sendId).andWhere('receiver_id', auth.user.id)
        })
        .update({ viewed: true })
    } catch (error) {
      return response.status(500).json({ message: 'Erreur lors de la lecture des messages' })
    }

    return response.ok({ message: 'Messages lus' })
  }

  /**
   * Marks a message as viewed by the authenticated user.
   * 
   * @param {object} ctx - The context object containing auth, request, and response.
   * @param {object} ctx.auth - The authentication object containing the authenticated user.
   * @param {object} ctx.request - The request object containing the message ID.
   * @param {object} ctx.response - The response object used to send the HTTP response.
   * 
   * @returns {Promise<void>} - A promise that resolves to void.
   * 
   * @throws {Error} - Throws an error if the message is not found, the user is not authorized to view the message, or there is an error while marking the message as viewed.
   */
  async haveViewSingle({ auth, request, response }) {
    // on met un message en lu
    logger.info('haveViewSingle')
    logger.info(request.all())
    const messageId = request.input('message_id')
    const message = await Message.find(messageId)
    if (!message) {
      return response.status(404).json({ message: 'Message non trouvé' })
    }
    if (message.receiverId != auth.user.id) {
      return response.status(403).json({ message: "Vous n'êtes pas autorisé à lire ce message" })
    }
    try {
      await message.merge({ viewed: true }).save()
    } catch (error) {
      return response.status(500).json({ message: 'Erreur lors de la lecture du message' })
    }
    return response.ok({ message: 'Message lu' })
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
        .preload('sender') // Charge les informations de l'utilisateur lié
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
      .preload('sender') // Charge les informations de l'utilisateur lié
      .orderBy('created_at', 'asc')
      .exec()
    return response.json(messages)
  }

  /**
   * Retrieves the history of messages for a specific team.
   * 
   * @param {Object} ctx - The context object containing auth, request, and response.
   * @param {Object} ctx.auth - The authentication object containing user information.
   * @param {Object} ctx.request - The request object containing input data.
   * @param {Object} ctx.response - The response object used to send back the HTTP response.
   * 
   * @returns {Promise<void>} - A promise that resolves to void. Sends a JSON response with the messages or an error message.
   * 
   * @throws {Error} - Throws an error if the user is not found or not authorized to access the team.
   */
  async getTeamHistory({ auth, request, response }) {
    const teamId = request.input('teamId')
    // on vérifie que l'utilisateur est bien dans l'équipe
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    const team = await user.related('teams').query().where('team_id', teamId).first()
    if (!team) {
      return response
        .status(403)
        .json({ message: "Vous n'êtes pas autorisé à accéder à cette équipe" })
    }
    const messages = await Message.query()
      .where((query) => {
        query.where('team_id', teamId)
      })
      .preload('sender') // Charge les informations de l'utilisateur lié
      .orderBy('created_at', 'asc')
      .exec()
    return response.json(messages)
  }

  /**
   * Sends a message to a team.
   *
   * @param {object} ctx - The context object containing auth, request, and response.
   * @param {object} ctx.auth - The authentication object containing user information.
   * @param {object} ctx.request - The request object containing input data.
   * @param {object} ctx.response - The response object for sending HTTP responses.
   * @returns {Promise<object>} The response object with a success or error message.
   *
   * @throws {Error} If there is an error while saving the message or sending the notification.
   */
  async sendTeamMessage({ auth, request, response }) {
    const teamId = request.input('teamId')
    const message = request.input('message')
    // on vérifie que l'utilisateur est bien dans l'équipe
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({ message: 'Utilisateur non trouvé' })
    }
    const team = await user.related('teams').query().where('team_id', teamId).first()
    if (!team) {
      return response
        .status(403)
        .json({ message: "Vous n'êtes pas autorisé à envoyer un message à cette équipe" })
    }
    const newMessage = new Message()
    newMessage.senderId = auth.user.id
    newMessage.teamId = teamId
    newMessage.content = message
    newMessage.senderName = auth.user.fullName
    try {
      await newMessage.save()
      const channel = `chats/team-${teamId}/messages`
      const chatMessage: ChatMessage = {
        message: message,
        sender: auth.user.id,
        senderName: auth.user.fullName,
        createdAt: Date.now(),
        messageId: newMessage.id,
        senderImage: auth.user.imageUrl,
      }
      await NotificationService.sendNotification(channel, chatMessage)
    } catch (error) {
      return response.status(500).json({ message: "Erreur lors de l'envoi du message" })
    }
    return response.json({ message: 'Message envoyé' })
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
  async sendMessage({ auth, request, response }) {
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
        const channel = 'chats/global/messages'
        const chatMessage: ChatMessage = {
          message: message,
          sender: auth.user.id,
          senderName: auth.user.fullName,
          createdAt: Date.now(),
          messageId: newMessage.id,
          senderImage: auth.user.imageUrl,
        }
        await NotificationService.sendNotification(channel, chatMessage)
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
    newMessage.senderName = auth.user.fullName
    const channel =
      auth.user.id < receiverId ? `${auth.user.id}-${receiverId}` : `${receiverId}-${auth.user.id}`
    newMessage.channelId = channel
    logger.info(channel)
    try {
      await newMessage.save()
      const channelT = `chats/${channel}/messages`
      const chatMessage: ChatMessage = {
        message: message,
        sender: auth.user.id,
        senderName: auth.user.fullName,
        createdAt: Date.now(),
        messageId: newMessage.id,
        senderImage: auth.user.imageUrl,
      }
      await NotificationService.sendNotification(channelT, chatMessage)
      // on attend 0.5s pour être sûr que le message est bien enregistré puis on verifie si le message a été vu
      setTimeout(async () => {
        const message = await db.from('messages').where('id', newMessage.id).first()
        logger.info('envoi de la notif')
        if (message && !message.viewed) {
          logger.info('message non vu')
          const channelNotif = `notifications/${receiverId}`
          const notificationMessage: NotificationMessage = {
            message: 'msg reçu',
            senderId: auth.user.id,
            senderName: auth.user.fullName,
            channelId: channel,
            messageViewed: false,
            senderImage: auth.user.imageUrl,
            type: NotificationType.MESSAGE,
          }
          await NotificationService.sendNotification(channelNotif, notificationMessage)
        }
      }, 1000)
    } catch (error) {
      return response.status(500).json({ message: "Erreur lors de l'envoi du message" })
    }
    return response.json({ message: 'Message envoyé' })
  }
}
