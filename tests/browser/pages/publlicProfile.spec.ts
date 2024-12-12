import { test } from '@japa/runner'
import User from '#models/user'

test.group('Public profile', () => {
  test('displays user profile', async ({ visit }) => {
    const user = new User()
    user.email = 'test1@test.com'
    user.password = 'secret'
    user.save()
    const page = await visit('/profile')
    await page.fill('input[name="email"]', user.email)
    await page.fill('input[name="password"]', user.password)
    await page.click('button[type="submit"]')
    // on va sur la page de profil
    const page1 = await visit('/profile')
    // on charge le js
    const profile = page1.locator('fullname-container')
    await profile.waitFor();
    await page1.assertTextContains('body', user.email)
})

test('unauthenticated user is redirected to login page', async ({ visit }) => {
    const page = await visit('/profile')
    await page.assertPath('/login')
})
})