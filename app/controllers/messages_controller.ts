// import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Message from '#models/message'
import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'
import { log } from 'console'

export default class MessageriesController {
    async index({auth, view}) {
        // Récupérer les utilisateurs actifs (ou tous les utilisateurs, selon vos critères)
        const users = await User.getAllUsers()
    
        // on enlève l'utilisateur connecté de la liste des utilisateurs
        const authUser = users.find(user => user.id === auth.user.id)
        const globalUser = users.find(user => user.id === 999999)
        if (authUser) {
            users.splice(users.indexOf(authUser), 1)
        }
        if (globalUser) {
            users.splice(users.indexOf(globalUser), 1)
        }
        return view.render('pages/chat', { users: users.map(user => user.serialize()) })
    }

    async getHistory({ auth, request, response }) {
        // on verifie que reveiverIq correspond à un utilisateur existant
        logger.info('getHistory')
        logger.info(auth.user.id)
        logger.info( request.all())
        const receiverId = request.input('receiver_id')
        if (receiverId == 999999) {
          // on recupere les  chat du chat global
          const messages = await Message.query().where((query) => {query.where('channel_id', 'global')}).orderBy('created_at', 'asc').exec()
          return response.json(messages)
        }
        const receiver = await User.find(receiverId)
        if (!receiver) {
          return response.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        const messages = await Message.query().where((query) => {query.where('sender_id', auth.user.id).andWhere('receiver_id', receiverId)
      }).orWhere((query) => {query.where('sender_id', receiverId).andWhere('receiver_id', auth.user.id)})
      .orderBy('created_at', 'asc')
      .exec()
      return response.json(messages)
    }

    async sendMessage({ auth, request, response, session }) {
        const receiverId = request.input('receiver_id')
        const message = request.input('content')
        logger.info('sendMessage')
        logger.info(receiverId)
        if (receiverId == 999999) {
          // on envoie le message au chat global
          const newMessage = new Message()
          newMessage.senderId = auth.user.id
          newMessage.receiverId = 999999
          newMessage.content = message
          newMessage.channelId = 'global'
          newMessage.senderName = auth.user.fullName
          try {
            transmit.broadcast('chats/global/messages', { message: message, sender: auth.user.id, senderName: auth.user.fullName, createdAt: newMessage.createdAt.toISO() })
            await newMessage.save()
          } catch (error) {
            logger.error(error)
            return response.status(500).json({ message: 'Erreur lors de l\'envoi du message' })
          }
        }
        const receiver = await User.find(receiverId)
        if (!receiver) {
          return response.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        const newMessage = new Message()
        newMessage.senderId = auth.user.id
        newMessage.receiverId = receiverId
        newMessage.content= message
        // le nom du channel est l'id le plus petit en premier suivi de l'id le plus grand avec un tiret entre les deux
        const channel = auth.user.id < receiverId ? `${auth.user.id}-${receiverId}` : `${receiverId}-${auth.user.id}`
        newMessage.channelId = channel
        logger.info(channel)
        try {
          transmit.broadcast(`chats/${channel}/messages`, { message: message, sender: auth.user.id })
          await newMessage.save()
        } catch (error) {
          return response.status(500).json({ message: 'Erreur lors de l\'envoi du message' })
        }
        return response.json({ message: 'Message envoyé' })

      }

}