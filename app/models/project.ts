import { DateTime } from 'luxon'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { BaseModel, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import Team from '#models/team'
import Task from '#models/task'

export default class Project extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare imageUrl: string

  @column()
  declare status: string

  @column()
  declare startDate: DateTime

  @column()
  declare endDate: DateTime

  @hasMany(() => Task)
  declare tasks: HasMany<typeof Task>

  @hasOne(() => Team)
  declare team: HasOne<typeof Team>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}