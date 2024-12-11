import { DateTime } from 'luxon'
import User from '#models/user'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
export default class Message extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public senderName: string // Le nom de l'utilisateur qui a envoyé le message

  @column()
  public channelId: string // Le canal de discussion

  @column()
  public content: string // Le contenu du message

  @column()
  public viewed: boolean = false // Le message a-t-il été vu ?

  @column()
  public senderId: number // ID de l'utilisateur qui a envoyé le message

  @column()
  public teamId: number // ID de l'équipe à laquelle appartient l'utilisateur qui a envoyé le message

  @column()
  public receiverId: number // ID de l'utilisateur qui a reçu le message

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime // Date de création du message

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime // Dernière date de modification

  // Relations avec le modèle User
  @hasOne(() => User, {
    localKey: 'senderId',
    foreignKey: 'id',
  })
  declare sender: HasOne<typeof User>

  @hasOne(() => User, {
    localKey: 'receiverId',
    foreignKey: 'id',
  })
  declare receiver: HasOne<typeof User>
}
