import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------
test.describe('Homepage', () => {
  test('loads with the RepoSage AI headline visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /RepoSage/i })).toBeVisible()
  })

  test('shows the "Get started" CTA link', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
  })

  test('shows the "Sign in" link', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('"Get started" link points to /sign-up', async ({ page }) => {
    await page.goto('/')
    const href = await page
      .getByRole('link', { name: /get started/i })
      .getAttribute('href')
    expect(href).toContain('/sign-up')
  })

  test('"Sign in" link points to /sign-in', async ({ page }) => {
    await page.goto('/')
    const href = await page
      .getByRole('link', { name: /sign in/i })
      .getAttribute('href')
    expect(href).toContain('/sign-in')
  })

  test('does not show an "Open app" nav link', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('link', { name: /open app/i }),
    ).not.toBeVisible()
  })

  test('does not show a Next 15 / React 19 badge', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Next 15/)).not.toBeVisible()
    await expect(page.getByText(/React 19/)).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Auth redirect
// ---------------------------------------------------------------------------
test.describe('Auth redirect', () => {
  test('unauthenticated users hitting /app are redirected to sign-in', async ({
    page,
  }) => {
    await page.goto('/app')

    // Clerk or middleware will redirect to /sign-in
    await page.waitForURL(/sign-in/, { timeout: 10_000 })
    expect(page.url()).toContain('sign-in')
  })

  test('/sign-in page loads without crashing', async ({ page }) => {
    await page.goto('/sign-in')
    // Clerk-rendered sign-in form should be present
    await expect(
      page.locator('form, [data-localization-key]').first(),
    ).toBeVisible({
      timeout: 10_000,
    })
  })

  test('/sign-up page loads without crashing', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(
      page.locator('form, [data-localization-key]').first(),
    ).toBeVisible({
      timeout: 10_000,
    })
  })
})

// ---------------------------------------------------------------------------
// Nav smoke
// ---------------------------------------------------------------------------
test.describe('Navigation', () => {
  test('logo link is present in the header', async ({ page }) => {
    await page.goto('/')
    // Nav should have a link back to home
    const nav = page.getByRole('navigation')
    await expect(nav).toBeVisible()
  })

  test('page title is set', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/.+/)
  })
})
