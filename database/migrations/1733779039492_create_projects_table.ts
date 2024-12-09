import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'projects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.text('description').notNullable()
      table.string('image_url').nullable()
      table.enu('status', ['active', 'inactive']).defaultTo('active')
      table.dateTime('start_date').notNullable()
      table.dateTime('end_date').notNullable()
      table.integer('team_id').unsigned().references('id').inTable('teams').onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}