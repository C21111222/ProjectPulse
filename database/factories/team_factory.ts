import factory from '@adonisjs/lucid/factories'
import Team from '#models/team'

export const TeamFactory = factory
  .define(Team, async ({ faker }) => {
    return {}
  })
  .build()