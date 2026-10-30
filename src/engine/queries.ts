// Answers to the four user questions, computed from an AnalysisResult (no re-parsing).
// Q1: delivery term of a contract on the check date → deliveryTermOnDate.
// Q2, Q3: contract amount → contractAmount.
// Q4: contracts with delivery strictly before a threshold, and unapproved term changes → contractsDueBefore.

import { FIELD_KEYS } from './fields'
import { NO_DATA, formatDate, formatMoney } from './format'
import { normalizeNumber, toCheckDate, type DateInput } from './text'
import type { AnalysisResult, ContractResult, FieldValue, PendingChange } from './types'

export interface FieldAnswer {
  /** Contract number as asked. */
  contractNumber: string
  /** null when no uploaded contract has this number. */
  contract: ContractResult | null
  /** null when the contract is not found. */
  field: FieldValue | null
  /** Unapproved changes of this field (letters, drafts, not yet effective amendments). */
  pending: PendingChange[]
  /** ISO check date the answer is valid for. */
  checkDate: string
  /** One-line Russian answer for the UI. */
  text: string
}

export function findContract(result: AnalysisResult, contractNumber: string): ContractResult | null {
  const key = normalizeNumber(contractNumber)
  return result.contracts.find((c) => c.key === key) ?? null
}

function sourceText(field: FieldValue): string {
  if (field.changedBy) return ` (изменено: ${field.changedBy.fileName})`
  const first = field.evidence[0]
  const why = field.status === 'no_data' && field.reason ? ` — ${field.reason}` : ''
  return `${why}${first ? ` (источник: ${first.fileName})` : ''}`
}

/** «; строка договора требует проверки: …» when the row needs review but the answered value itself does not say so. */
function rowReview(contract: ContractResult, field: FieldValue): string {
  if (!contract.needsReview || field.status === 'needs_review') return ''
  const reasons = [...new Set(contract.issues.map((i) => i.message))].join('; ')
  return `; строка договора требует проверки: ${reasons || 'другие поля требуют проверки'}`
}

function fieldAnswer(result: AnalysisResult, contractNumber: string, key: string, describe: (f: FieldValue) => string): FieldAnswer {
  const contract = findContract(result, contractNumber)
  const checkDate = result.checkDate
  if (!contract) {
    return { contractNumber, contract: null, field: null, pending: [], checkDate, text: `Договор ${contractNumber} не найден среди загруженных документов` }
  }
  const field = contract.fields[key]
  const pending = contract.pendingChanges.filter((p) => p.field === key)
  let text = describe(field)
  if (field.status === 'needs_review') text += ` — требует проверки: ${field.reason ?? ''}`.trimEnd()
  if (pending.length > 0) text += `; есть несогласованные изменения: ${pending.length}`
  text += rowReview(contract, field)
  return { contractNumber, contract, field, pending, checkDate, text }
}

/** Q1: delivery term in force on the check date of the analysis. */
export function deliveryTermOnDate(result: AnalysisResult, contractNumber: string): FieldAnswer {
  return fieldAnswer(result, contractNumber, FIELD_KEYS.deliveryDate, (f) => {
    const value = typeof f.value === 'string' ? formatDate(f.value) : NO_DATA
    return `Срок поставки по договору ${contractNumber} на ${formatDate(result.checkDate)}: ${value}${sourceText(f)}`
  })
}

/** Q2, Q3: contract amount in force on the check date. */
export function contractAmount(result: AnalysisResult, contractNumber: string): FieldAnswer {
  return fieldAnswer(result, contractNumber, FIELD_KEYS.amount, (f) => {
    const value = typeof f.value === 'number' ? formatMoney(f.value) : NO_DATA
    return `Сумма договора ${contractNumber}: ${value}${sourceText(f)}`
  })
}

export interface DueBeforeItem {
  contract: ContractResult
  deliveryDate: string
  field: FieldValue
  /** Unapproved changes of the delivery term. */
  pendingDeliveryChanges: PendingChange[]
  hasUnapprovedDeliveryChange: boolean
}

export interface DueBeforeAnswer {
  /** ISO threshold; a contract matches when its delivery date is strictly earlier. */
  threshold: string
  checkDate: string
  items: DueBeforeItem[]
  /** Contracts whose delivery term is unknown or needs review: they cannot be placed. */
  undetermined: ContractResult[]
  text: string
}

/**
 * Q4: contracts with delivery planned strictly before `threshold`, with unapproved term changes.
 * `threshold`: `YYYY-MM-DD` string (recommended) or a Date read as its local calendar day.
 */
export function contractsDueBefore(result: AnalysisResult, threshold: DateInput): DueBeforeAnswer {
  const limit = toCheckDate(threshold)
  const key = FIELD_KEYS.deliveryDate
  const items: DueBeforeItem[] = []
  const undetermined: ContractResult[] = []
  for (const contract of result.contracts) {
    const field = contract.fields[key]
    if (typeof field.value !== 'string' || field.status !== 'ok') {
      undetermined.push(contract)
      continue
    }
    if (field.value < limit) {
      const pendingDeliveryChanges = contract.pendingChanges.filter((p) => p.field === key)
      items.push({ contract, deliveryDate: field.value, field, pendingDeliveryChanges, hasUnapprovedDeliveryChange: pendingDeliveryChanges.length > 0 })
    }
  }
  items.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
  const list = items
    .map((i) => {
      const changes = i.pendingDeliveryChanges.map((p) => `${p.proposedValue && typeof p.proposedValue === 'string' ? formatDate(p.proposedValue) : NO_DATA} — ${p.reasonText}`)
      return `${i.contract.number ?? i.contract.fileName} (${formatDate(i.deliveryDate)}${changes.length ? `; несогласованное изменение срока: ${changes.join('; ')}` : '; несогласованных изменений срока нет'}${rowReview(i.contract, i.field)})`
    })
    .join(', ')
  let text = items.length
    ? `Поставка раньше ${formatDate(limit)}: ${list}`
    : `Договоров с поставкой раньше ${formatDate(limit)} нет`
  if (undetermined.length) text += `. Срок не определён: ${undetermined.map((c) => c.number ?? c.fileName).join(', ')}`
  return { threshold: limit, checkDate: result.checkDate, items, undetermined, text }
}
