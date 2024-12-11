import { DateTime } from 'luxon'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { column, BaseModel, manyToMany } from '@adonisjs/lucid/orm'
import User from '#models/user'

export default class Team extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare imageUrl: string

  @column()
  declare status: 'active' | 'inactive'

  @column()
  declare startDate: DateTime

  @column()
  declare endDate: DateTime

  @manyToMany(() => User)
  declare users: ManyToMany<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
