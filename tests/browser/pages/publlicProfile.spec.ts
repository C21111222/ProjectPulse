import { test } from '@japa/runner'
import User from '#models/user'
import { time } from 'console'

test.group('Public profile', () => {
  test('displays user profile', async ({ visit }) => {
    const user = new User()
    user.fullName = 'test'
    user.email = 'test1@test.com'
    user.password = 'secret'
    await user.save()
    const page = await visit('/login')
    await page.fill('input[name="email"]', user.email)
    await page.fill('input[name="password"]', user.password)
    await page.click('button[type="submit"]')
    // on va sur la page de profil
    const page1 = await visit('/profile')
    await page1.assertTextContains('body', user.email)
})

test('unauthenticated user is redirected to login page', async ({ visit }) => {
    const page = await visit('/profile')
    await page.assertPath('/login')
})
})