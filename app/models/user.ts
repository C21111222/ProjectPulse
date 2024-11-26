import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Image from '#models/image'

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

  // method pour recuperer tous les utilisateurs actifs
  public static async getAllUsers() {
    return await User.query().select('id', 'full_name', 'email')
  }

  // to json
  public serialize() {
    return {
      id: this.id,
      fullName: this.fullName,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
