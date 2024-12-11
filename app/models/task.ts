import { DateTime } from 'luxon'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { BaseModel, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import User from '#models/user'
import Team from '#models/team'

export default class Task extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare description: string

  @column()
  declare status: 'waiting' | 'in_progress' | 'done'

  @column()
  declare priority: 'high' | 'medium' | 'low'

  @column()
  declare startDate: DateTime

  @column()
  declare endDate: DateTime

  @column()
  declare teamId: number

  @hasOne(() => Team)
  declare team: HasOne<typeof Team>

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
