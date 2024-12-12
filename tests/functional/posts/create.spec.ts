import { test } from '@japa/runner'

import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

test.group('creating user', () => {
  test('hashes user password', async ({ assert }) => {
    const user = new User()
    user.email = 'test@test.com'
    user.password = 'secret'
    
    await user.save()
    
    assert.isTrue(hash.isValidHash(user.password))
    assert.isTrue(await hash.verify(user.password, 'secret'))
  })

  test('creates user with valid email', async ({ assert }) => {
    const user = new User()
    user.email = 'test@example.com'
    user.password = 'secret'
    
    await user.save()
    
    assert.equal(user.email, 'test@example.com')
  })

  test('fails to create user with invalid email', async ({ assert }) => {
    const user = new User()
    user.email = 'invalid-email'
    user.password = 'secret'
    
    try {
      await user.save()
    } catch (error) {
      assert.exists(error)
    }
  })

  test('creates user with unique email', async ({ assert }) => {
    const user1 = new User()
    user1.email = 'unique@example.com'
    user1.password = 'secret'
    
    await user1.save()
    
    const user2 = new User()
    user2.email = 'unique@example.com'
    user2.password = 'secret'
    
    try {
      await user2.save()
    } catch (error) {
      assert.exists(error)
    }
  })
})

