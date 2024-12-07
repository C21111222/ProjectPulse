import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasOne, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Team from '#models/team'
import Message from '#models/message'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare imageUrl: string

  constructor() {
    super()
    this.imageUrl = 'https://projectpulse.pautentia.fr/img/unknow.jpg'
  }

  @manyToMany(() => Team,
    {
      pivotTable: 'user_teams',
      pivotForeignKey: 'user_id',
      pivotRelatedForeignKey: 'team_id',
      pivotColumns: ['role'], 
    })
  declare teams: ManyToMany<typeof Team>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  public getFullName() {
    return this.fullName
  }

  public getMail() {
    return this.email
  }

  public getImage() {
    return this.imageUrl
  }

  // to json
  public serialize() {
    return {
      id: this.id,
      fullName: this.fullName,
      email: this.email,
      imageUrl: this.imageUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  public async getUnreadMessages() {
    const users = await User.query().exec()
    const authUser = users.find((user) => user.id === this.id)
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
          query.where('sender_id', user.id).andWhere('receiver_id', this.id)
        })
        .orderBy('created_at', 'desc')
        .first()
      if (lastMessage && !lastMessage.viewed) {
        resultat.push({
          user: user.serialize(),
          image: user.imageUrl,
          messageViewed: lastMessage.viewed,
          type: 'MESSAGE',
        })
      }
    }
    return resultat
  }

}
