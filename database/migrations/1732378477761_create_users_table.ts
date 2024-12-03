import { BaseSchema } from '@adonisjs/lucid/schema'
import User from '#models/user'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.string('image_url').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    // on ajoute un utilisateur par défaut
    await User.create({
      fullName: 'Corentin',
      email: 'c@c',
      password: 'c',
      imageUrl: 'https://projectpulse.pautentia.fr/img/unknow.jpg',
    })
    // on ajoute un utilisateur 'Global' avec 999999 comme id
    await User.create({
      id: 999999,
      fullName: 'Global',
      email: 'global@global',
      password: 'global',
      imageUrl: 'https://projectpulse.pautentia.fr/img/unknow.jpg',
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
