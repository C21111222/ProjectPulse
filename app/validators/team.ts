import vine from '@vinejs/vine'

export const createTeamValidator = vine.compile(
    vine.object({
      name: vine.string().minLength(1).maxLength(32).unique(async (query, field) => {
        const team = await query.from('teams').where('name', field).first()
        return !team
      }),
      description: vine.string().minLength(1).maxLength(255),
      start_date: vine.date().beforeField('end_date'),
      end_date: vine.date().afterField('today'),
      imageUrl: vine.string().optional(),
      status: vine.enum(['active', 'inactive'])
    })
  )