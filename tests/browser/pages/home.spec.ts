import { test } from '@japa/runner'

test.group('Home page', () => {
  test('see welcome message', async ({ visit }) => {
    const page = await visit('/')
    await page.assertTextContains('body', 'Bienvenue sur l\'outil de gestion de projet "ProjectPulse"')
  })
})
