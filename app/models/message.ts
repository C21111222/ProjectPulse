import { DateTime } from 'luxon'
import User from '#models/user'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'

export default class Message extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public senderId: number // L'utilisateur qui a envoyé le message

  @column()
  public senderName: string // Le nom de l'utilisateur qui a envoyé le message

  @column()
  public receiverId: number // L'utilisateur qui a reçu le message

  @column()
  public channelId: string // Le canal de discussion

  @column()
  public content: string // Le contenu du message

  @column()
  public viewed: boolean = false // Le message a-t-il été vu ?

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime // Date de création du message

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime // Dernière date de modification

  // Relations avec le modèle User
  @hasOne(() => User, {
    localKey: 'senderId',
    foreignKey: 'id',
  })
  declare sender: User

  @hasOne(() => User, {
    localKey: 'receiverId',
    foreignKey: 'id',
  })
  declare receiver: User
}
