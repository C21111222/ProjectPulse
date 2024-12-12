import vine from '@vinejs/vine'

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().maxLength(32),
    password: vine.string().maxLength(32),
  })
)

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().unique(async (query, field) => {
      const user = await query.from('users').where('email', field).first()
      return !user
    }),
    password: vine.string().minLength(1).maxLength(32),
    password_confirmation: vine.string().sameAs('password'),
    fullName: vine.string().minLength(1).maxLength(32),
  })
)
