// @vitest-environment jsdom
import './ds/test-setup.ts'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { loadDocuments } from './test/evidence'

function documentFiles(): File[] {
  return loadDocuments().map((d) => new File([d.text], d.name, { type: 'text/plain' }))
}

async function renderWithDocuments() {
  const user = userEvent.setup()
  render(<App />)
  await user.upload(screen.getByTestId('file-input'), documentFiles())
  await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(4))
  return user
}

const cell = (contract: string, field: string) => screen.getByTestId(`cell-${contract}-${field}`)
const rowOf = (contract: string) => cell(contract, 'number').closest('tr') as HTMLElement

describe('procurement screen', () => {
  it('shows the empty state before upload', () => {
    render(<App />)
    expect(screen.getByText('Документы не загружены')).toBeInTheDocument()
    expect(screen.getByTestId('check-date')).toHaveValue('2026-03-10')
  })

  it('uploads documents/* and shows the three contracts with reference values', async () => {
    await renderWithDocuments()
    expect(cell('STN-101', 'amount')).toHaveTextContent('1 380 000 ₽')
    expect(cell('STN-101', 'amount')).toHaveTextContent('изменено: 02_amendment_signed.txt')
    expect(cell('STN-101', 'amount')).toHaveTextContent('было: 1 200 000 ₽')
    expect(cell('STN-101', 'deliveryDate')).toHaveTextContent('30.04.2026')
    expect(cell('STN-102', 'amount')).toHaveTextContent('840 000 ₽')
    expect(cell('STN-102', 'deliveryDate')).toHaveTextContent('20.03.2026')
    expect(cell('STN-103', 'supplier')).toHaveTextContent('ООО «ПромСнаб Сервис»')
    expect(cell('STN-103', 'deliveryDate')).toHaveTextContent('30.04.2026')
    // Document list: recognized type and linked contract.
    expect(within(screen.getByTestId('doc-05_supplier_email.txt')).getByText('Письмо')).toBeInTheDocument()
    expect(within(screen.getByTestId('doc-05_supplier_email.txt')).getByText('→ STN-102')).toBeInTheDocument()
    expect(within(screen.getByTestId('doc-06_amendment_draft.txt')).getByText('Проект')).toBeInTheDocument()
    expect(screen.getByTestId('pending-section')).toHaveTextContent('05_supplier_email.txt')
  })

  it('STN-103 amount is «нет данных», not zero or a dash', async () => {
    await renderWithDocuments()
    expect(cell('STN-103', 'amount').textContent).toMatch(/^нет данных/)
    expect(cell('STN-103', 'amount')).not.toHaveTextContent('600 000')
  })

  it('click on the STN-101 delivery term opens the evidence panel with the amendment quote', async () => {
    const user = await renderWithDocuments()
    await user.click(cell('STN-101', 'deliveryDate'))
    const panel = await screen.findByTestId('evidence-panel')
    expect(within(panel).getByTestId('evidence-value')).toHaveTextContent('30.04.2026')
    expect(within(panel).getAllByText(/02_amendment_signed\.txt/).length).toBeGreaterThan(0)
    expect(panel).toHaveTextContent('«Поставщик обязуется поставить оборудование не позднее 30.04.2026»')
    expect(panel).toHaveTextContent('«Поставщик обязуется поставить оборудование не позднее 15.04.2026.»')
    expect(panel).toHaveTextContent('Сведения для проверки (не действуют)')
    const highlighted = panel.querySelector('[data-highlighted="true"]')
    expect(highlighted?.id).toBe('02_amendment_signed.txt-p6')
  })

  it('question 4 leaves only STN-102 with an unapproved term change', async () => {
    const user = await renderWithDocuments()
    await user.click(screen.getByTestId('question-4'))
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(rowOf('STN-102')).toHaveTextContent('есть несогласованные изменения')
    expect(screen.getByTestId('answer')).toHaveTextContent('STN-102 (20.03.2026; несогласованное изменение срока: 27.03.2026')
  })

  it('questions 1–3 answer from the analysis and highlight the cell', async () => {
    const user = await renderWithDocuments()
    await user.click(screen.getByTestId('question-1'))
    expect(screen.getByTestId('answer')).toHaveTextContent('30.04.2026')
    expect(cell('STN-101', 'deliveryDate')).toHaveAttribute('data-highlighted', 'true')
    await user.click(screen.getByTestId('question-2'))
    expect(screen.getByTestId('answer')).toHaveTextContent('840 000 ₽')
    await user.click(screen.getByTestId('question-3'))
    expect(screen.getByTestId('answer')).toHaveTextContent('нет данных')
  })

  it('a question about a contract that is not uploaded answers «нет данных»', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('question-2'))
    expect(screen.getByTestId('answer')).toHaveTextContent(/^Нет данных: Договор STN-102 не найден/)
  })

  it('check date 28.02.2026 restores the original STN-101 term and amount', async () => {
    await renderWithDocuments()
    fireEvent.change(screen.getByTestId('check-date'), { target: { value: '2026-02-28' } })
    expect(cell('STN-101', 'deliveryDate')).toHaveTextContent('15.04.2026')
    expect(cell('STN-101', 'deliveryDate')).not.toHaveTextContent('изменено')
    expect(cell('STN-101', 'amount')).toHaveTextContent('1 200 000 ₽')
  })

  it('removing a file and clearing all', async () => {
    const user = await renderWithDocuments()
    await user.click(screen.getByRole('button', { name: 'Удалить 02_amendment_signed.txt' }))
    expect(cell('STN-101', 'deliveryDate')).toHaveTextContent('15.04.2026')
    await user.click(screen.getByRole('button', { name: /Очистить всё/ }))
    expect(screen.getByText('Документы не загружены')).toBeInTheDocument()
  })
})

describe('review round 1', () => {
  const extra = (name: string, text: string) => new File([text], name, { type: 'text/plain' })
  const unsignedAmendment = [
    'ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № 3 К ДОГОВОРУ STN-102',
    'Дата: 05.03.2026',
    'Статус: не подписано покупателем.',
    '1. Пункт 2.1 договора изложить в следующей редакции: «Общая стоимость поставки составляет 900 000 рублей, включая НДС».',
    '2. Настоящее соглашение вступает в силу 05.03.2026.',
  ].join('\n')
  const contractWithoutTerm = ['ДОГОВОР ПОСТАВКИ № Q-77', 'Статус: подписан обеими сторонами 01.02.2026.', '1.1. Поставщик: ООО «Без Срока».', '2.1. Общая стоимость поставки составляет 100 000 рублей.'].join('\n')

  it('unsigned amendment in «Сведения для проверки» is not labelled as signed', async () => {
    const user = await renderWithDocuments()
    await user.upload(screen.getByTestId('file-input'), [extra('a3.txt', unsignedAmendment)])
    const itemOf = (root: HTMLElement) => within(root).getAllByTestId('pending-item').find((el) => el.textContent?.includes('a3.txt')) as HTMLElement
    const item = itemOf(screen.getByTestId('pending-section'))
    expect(item).toHaveTextContent('Допсоглашение без подписи')
    expect(item).not.toHaveTextContent('Подписанное допсоглашение')
    await user.click(cell('STN-102', 'amount'))
    const panelItem = itemOf(await screen.findByTestId('evidence-panel'))
    expect(panelItem).not.toHaveTextContent('Подписанное допсоглашение')
  })

  it('unknown document is shown as «Не распознан»', async () => {
    const user = await renderWithDocuments()
    await user.upload(screen.getByTestId('file-input'), [extra('note.txt', 'Служебная записка\nПросим ускорить.')])
    expect(within(screen.getByTestId('doc-note.txt')).getByText('Не распознан')).toBeInTheDocument()
    expect(screen.getByTestId('global-issues')).toHaveTextContent('note.txt')
  })

  it('a contract with an undetermined term is named in the Q4 answer and under the table', async () => {
    const user = await renderWithDocuments()
    await user.upload(screen.getByTestId('file-input'), [extra('q77.txt', contractWithoutTerm)])
    await user.click(screen.getByTestId('question-4'))
    expect(screen.getByTestId('answer')).toHaveTextContent('Срок не определён: Q-77')
    expect(screen.getByTestId('undetermined')).toHaveTextContent('Q-77')
    expect(screen.queryByTestId('cell-Q-77-number')).toBeNull()
  })

  it('row with a no_data field is «нет данных: сумма», not «ок»', async () => {
    await renderWithDocuments()
    expect(rowOf('STN-103')).toHaveTextContent('нет данных: сумма')
    expect(within(rowOf('STN-103')).queryByText('ок')).toBeNull()
  })

  it('non-TXT files are reported, not dropped silently', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<App />)
    await user.upload(screen.getByTestId('file-input'), [new File(['x'], 'scan.pdf', { type: 'application/pdf' }), extra('c.txt', contractWithoutTerm)])
    expect(await screen.findByText('Принимаются только TXT, пропущены: scan.pdf')).toBeInTheDocument()
    expect(screen.getByTestId('doc-c.txt')).toBeInTheDocument()
  })

  it('manual check date change deselects question 1; the panel does not repeat «нет данных»', async () => {
    const user = await renderWithDocuments()
    await user.click(screen.getByTestId('question-1'))
    fireEvent.change(screen.getByTestId('check-date'), { target: { value: '2026-02-28' } })
    expect(screen.queryByTestId('answer')).toBeNull()
    await user.click(cell('STN-103', 'amount'))
    const panel = await screen.findByTestId('evidence-panel')
    expect(within(panel).getAllByText('нет данных')).toHaveLength(1)
  })

  it('«Показать в тексте» focuses the paragraph in the document view', async () => {
    const user = await renderWithDocuments()
    await user.click(cell('STN-101', 'deliveryDate'))
    const panel = await screen.findByTestId('evidence-panel')
    const buttons = within(panel).getAllByRole('button', { name: 'Показать в тексте' })
    await user.click(buttons[1])
    expect(within(panel).getByTestId('focused-paragraph').id).toBe('01_contract.txt-p8')
  })
})

describe('question 1 and the check date (D-14)', () => {
  it('moves the date to 10.03.2026 with a visible notice and a button that restores the old date', async () => {
    const user = await renderWithDocuments()
    fireEvent.change(screen.getByTestId('check-date'), { target: { value: '2026-02-28' } })
    await user.click(screen.getByTestId('question-1'))
    expect(screen.getByTestId('check-date')).toHaveValue('2026-03-10')
    expect(screen.getByTestId('date-changed')).toHaveTextContent('Дата проверки изменена на 10.03.2026 (дата из вопроса), была 28.02.2026')
    await user.click(screen.getByRole('button', { name: 'Вернуть 28.02.2026' }))
    expect(screen.getByTestId('check-date')).toHaveValue('2026-02-28')
    expect(screen.queryByTestId('date-changed')).toBeNull()
    expect(cell('STN-101', 'deliveryDate')).toHaveTextContent('15.04.2026')
  })

  it('no notice when the date is already 10.03.2026', async () => {
    const user = await renderWithDocuments()
    await user.click(screen.getByTestId('question-1'))
    expect(screen.queryByTestId('date-changed')).toBeNull()
  })

  it('a manual date change removes the notice together with the question', async () => {
    const user = await renderWithDocuments()
    fireEvent.change(screen.getByTestId('check-date'), { target: { value: '2026-02-28' } })
    await user.click(screen.getByTestId('question-1'))
    fireEvent.change(screen.getByTestId('check-date'), { target: { value: '2026-03-01' } })
    expect(screen.queryByTestId('date-changed')).toBeNull()
  })
})
