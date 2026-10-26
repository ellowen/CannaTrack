import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { gotoApp } from '../helpers/seed'

/**
 * Contra el Supabase REAL, con una cuenta de testing ya logueada.
 *
 * Descarta desde la UI todas las plantas activas de la cuenta Pro y verifica
 * que dejan de aparecer (listado, Home) y que quedan como "Descartada".
 *
 * Requisitos (el login lo hace una persona, nunca el test):
 *   cd frontend && npx playwright open --save-storage=e2e/.auth/pro.json http://localhost:5173/login
 *   (loguearse con pro@cannatrack.test y cerrar la ventana)
 * Sin ese archivo el test se saltea. Correr:
 *   npx playwright test e2e/real --project=desktop
 */

// Playwright corre con cwd = frontend/
const AUTH = path.resolve('e2e/.auth/pro.json')
const PRO_EMAIL = 'pro@cannatrack.test'

function databaseUrl(): string | undefined {
  const file = path.resolve('..', '.env.local')
  if (!fs.existsSync(file)) return undefined
  const line = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='))
  return line?.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '')
}

async function activePlantLinks(page: import('@playwright/test').Page) {
  const hrefs = await page.locator('a[href^="/plants/"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('href') as string).filter((h) => !h.endsWith('/new') && !h.endsWith('/edit')),
  )
  return [...new Set(hrefs)]
}

test.describe('Backend real: cancelar plantas activas (cuenta Pro)', () => {
  test.skip(!fs.existsSync(AUTH), 'falta e2e/.auth/pro.json: ver instrucciones en este archivo')
  test.use({ storageState: AUTH })

  test('descartar todas las activas desde la UI: dejan de aparecer y quedan Descartadas', async ({ page }) => {
    test.setTimeout(180_000)
    await gotoApp(page, '/plants')
    await expect(page.getByRole('heading', { name: /Mis plantas/ })).toBeVisible()

    const discarded: string[] = []
    for (let i = 0; i < 30; i++) {
      await gotoApp(page, '/plants') // filtro por defecto: solo activas
      const links = await activePlantLinks(page)
      if (links.length === 0) break
      await gotoApp(page, links[0])
      const name = await page.getByRole('heading', { level: 1 }).first().innerText()
      page.once('dialog', (d) => d.accept())
      await page.getByRole('button', { name: /Descartar/ }).first().click()
      await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
      discarded.push(name)
    }

    // 1. el listado de activas queda vacio
    await gotoApp(page, '/plants')
    await expect(page.getByText(/Sin plantas|No hay plantas/).first()).toBeVisible()
    expect(await activePlantLinks(page)).toHaveLength(0)

    // 2. las descartadas aparecen en su filtro
    await page.getByRole('button', { name: /Descartada/ }).click()
    for (const name of discarded) await expect(page.getByText(name, { exact: true }).first()).toBeVisible()

    // 3. Home ya no muestra plantas activas ni tareas pendientes
    await gotoApp(page, '/')
    await expect(page.getByText('Tu grow empieza aca')).toBeVisible()

    // 4. en la base real no queda ninguna activa
    const url = databaseUrl()
    if (url) {
      const { Client } = await import('pg')
      const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
      await c.connect()
      const r = await c.query(
        "select count(*)::int as n from plants where status = 'active' and user_id = (select id from auth.users where email = $1)",
        [PRO_EMAIL],
      )
      await c.end()
      expect(r.rows[0].n).toBe(0)
    }
  })
})
