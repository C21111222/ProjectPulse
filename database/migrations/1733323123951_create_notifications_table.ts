import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.enum('type', [
        'TEAM_INVITE',
        'TEAM_INVITE_ACCEPTED',
        'TEAM_INVITE_DECLINED',
        'TEAM_BANNED',
      ])
      table.integer('team_id').unsigned().references('id').inTable('teams').onDelete('CASCADE')
      table.integer('inviter_id').unsigned().references('id').inTable('users')
      table.integer('invitee_id').unsigned().references('id').inTable('users')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
