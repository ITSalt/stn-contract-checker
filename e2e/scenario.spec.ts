// Buyer scenario on documents/ with 10 fixed screenshots (names are stable between versions).
// Only getByRole / getByText / data-testid are used; every shot is taken after an expect.
import { expect, test, type Page } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SHOTS_DIR = resolve(process.env.SHOTS_DIR ?? 'artifacts/screenshots')
const DOCUMENTS = resolve('documents')

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(SHOTS_DIR, `${name}.png`) })
}

/** Scrolls so that the answer is at the top and the table below it is in view. */
async function showAnswer(page: Page) {
  await page.getByTestId('answer').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24))
}

const cell = (page: Page, contract: string, field: string) => page.getByTestId(`cell-${contract}-${field}`)

test('buyer scenario: upload, evidence, pending changes, four questions, check date, 1024 px', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Документы не загружены')).toBeVisible()
  await expect(page.getByTestId('check-date')).toHaveValue('2026-03-10')
  await shot(page, '01-empty')

  const files = readdirSync(DOCUMENTS).filter((n) => n.endsWith('.txt')).map((n) => join(DOCUMENTS, n))
  await page.getByTestId('file-input').setInputFiles(files)
  const table = page.getByTestId('contracts-table')
  await expect(table.getByRole('row')).toHaveCount(4)
  await expect(cell(page, 'STN-101', 'deliveryDate')).toContainText('30.04.2026')
  await expect(cell(page, 'STN-102', 'amount')).toContainText('840 000 ₽')
  await expect(cell(page, 'STN-103', 'amount')).toContainText('нет данных')
  await table.scrollIntoViewIfNeeded()
  await shot(page, '02-uploaded-table')

  await cell(page, 'STN-101', 'deliveryDate').click()
  const panel = page.getByTestId('evidence-panel')
  await expect(panel.getByTestId('evidence-value')).toHaveText('30.04.2026')
  await expect(panel.getByText('02_amendment_signed.txt · p6').first()).toBeVisible()
  await expect(panel.getByText('«Поставщик обязуется поставить оборудование не позднее 30.04.2026»', { exact: true })).toBeVisible()
  await shot(page, '03-evidence-stn101-delivery')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  const pending = page.getByTestId('pending-section')
  await expect(pending.getByText('05_supplier_email.txt · p6')).toBeVisible()
  await expect(pending.getByText('06_amendment_draft.txt · p5')).toBeVisible()
  await pending.scrollIntoViewIfNeeded()
  await shot(page, '04-pending-changes')

  const answer = page.getByTestId('answer')
  await page.getByTestId('question-1').click()
  await expect(answer).toContainText('Срок поставки по договору STN-101 на 10.03.2026: 30.04.2026')
  await expect(cell(page, 'STN-101', 'deliveryDate')).toHaveAttribute('data-highlighted', 'true')
  await showAnswer(page)
  await shot(page, '05-q1-stn101-delivery')

  await page.getByTestId('question-2').click()
  await expect(answer).toContainText('Сумма договора STN-102: 840 000 ₽')
  await showAnswer(page)
  await shot(page, '06-q2-stn102-amount')

  await page.getByTestId('question-3').click()
  await expect(answer).toContainText('Сумма договора STN-103: нет данных')
  await showAnswer(page)
  await shot(page, '07-q3-stn103-amount')

  await page.getByTestId('question-4').click()
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(cell(page, 'STN-102', 'deliveryDate')).toContainText('20.03.2026')
  await expect(answer).toContainText('несогласованное изменение срока: 27.03.2026')
  await showAnswer(page)
  await shot(page, '08-q4-before-april')

  await page.getByRole('button', { name: 'Сбросить фильтры' }).click()
  await expect(table.getByRole('row')).toHaveCount(4)
  await page.getByTestId('check-date').fill('2026-02-28')
  await expect(cell(page, 'STN-101', 'deliveryDate')).toContainText('15.04.2026')
  await expect(cell(page, 'STN-101', 'amount')).toContainText('1 200 000 ₽')
  await table.scrollIntoViewIfNeeded()
  await shot(page, '09-checkdate-28-02')

  await page.getByTestId('check-date').fill('2026-03-10')
  await expect(cell(page, 'STN-101', 'deliveryDate')).toContainText('30.04.2026')
  await page.setViewportSize({ width: 1024, height: 900 })
  await table.scrollIntoViewIfNeeded()
  await expect(cell(page, 'STN-101', 'deliveryDate')).toBeVisible()
  const scroll = page.getByTestId('data-table-scroll')
  const fits = await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
  expect(fits, 'table fits 1024 px without horizontal scroll').toBe(true)
  const pageFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(pageFits, 'page has no horizontal scroll at 1024 px').toBe(true)
  await shot(page, '10-width-1024')
})

test('training set button loads the same files through analyze', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Загрузить учебный комплект' }).click()
  await expect(page.getByTestId('contracts-table').getByRole('row')).toHaveCount(4)
  await expect(cell(page, 'STN-101', 'amount')).toContainText('1 380 000 ₽')
  await expect(page.getByRole('list', { name: 'Загруженные документы' }).getByRole('listitem')).toHaveCount(6)
})
