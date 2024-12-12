import { test } from '@japa/runner'
import User from '#models/user'

test.group('Dashboard', () => {
  test('redirects to login page when not authenticated', async ({ visit }) => {
    const page = await visit('/dashboard')
    await page.assertPath('/login')
  })
  test('displays dashboard when authenticated', async ({ visit }) => {
    // on crée un utilisateur
    const user = new User()
    user.email = 'test@test.com'
    user.password = 'secret'
    const page = await visit('/login')
    await page.fill('input[name="email"]', 'test@test.com')
    await page.fill('input[name="password"]', 'secret')
    await page.click('button[type="submit"]')
    await page.assertPath('/dashboard')
    await page.assertTextContains('body', 'Vous êtes connecté(e) avec succès. Profitez de votre espace personnel.')
    })


})