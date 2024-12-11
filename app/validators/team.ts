import vine from '@vinejs/vine'

export const createTeamValidator = vine.compile(
    vine.object({
      name: vine.string().minLength(1).maxLength(32),
      description: vine.string().minLength(1).maxLength(255),
      start_date: vine.date().before('end_date'),
      end_date: vine.date().after('today'),
      imageUrl: vine.string().optional(),
      status: vine.enum(['active', 'inactive'])
    })
  )