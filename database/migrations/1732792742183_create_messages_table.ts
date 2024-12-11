import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('sender_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('sender_name')
      table.integer('receiver_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table
        .integer('team_id')
        .unsigned()
        .references('id')
        .inTable('teams')
        .onDelete('CASCADE')
        .nullable()
      table.string('channel_id')
      table.boolean('viewed').defaultTo(false)
      table.text('content')
      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
