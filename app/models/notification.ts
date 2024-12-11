import { DateTime } from 'luxon'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Team from '#models/team'

export default class Notification extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare type: 'TEAM_INVITE' | 'TEAM_INVITE_ACCEPTED' | 'TEAM_INVITE_DECLINED' | 'TEAM_BANNED'

  @column()
  declare teamId: number

  @column()
  declare inviterId: number

  @column()
  declare inviteeId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasOne(() => User, {
    localKey: 'inviterId',
    foreignKey: 'id',
  })
  declare inviter: HasOne<typeof User>

  @hasOne(() => User, {
    localKey: 'inviteeId',
    foreignKey: 'id',
  })
  declare invitee: HasOne<typeof User>

  @hasOne(() => Team, {
    localKey: 'teamId',
    foreignKey: 'id',
  })
  declare team: HasOne<typeof Team>
}
