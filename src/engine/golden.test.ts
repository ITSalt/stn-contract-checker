// Reference result on the training documents (documents/) at the check date 10.03.2026.
import { describe, expect, it } from 'vitest'
import { analyze, contractAmount, contractsDueBefore, deliveryTermOnDate, findContract } from './index'
import { loadDocuments, quoteErrors } from '../test/evidence'

const CHECK_DATE = new Date(2026, 2, 10)

describe('documents/ at 10.03.2026', () => {
  const result = analyze(loadDocuments(), CHECK_DATE)

  it('finds exactly three contracts and no global problems', () => {
    expect(result.checkDate).toBe('2026-03-10')
    expect(result.contracts.map((c) => c.number)).toEqual(['STN-101', 'STN-102', 'STN-103'])
    expect(result.issues).toEqual([])
  })

  it('classifies documents by text', () => {
    const types = Object.fromEntries(result.documents.map((d) => [d.fileName, [d.docType, d.contractNumber, d.signStatus]]))
    expect(types).toEqual({
      '01_contract.txt': ['contract', 'STN-101', 'signed_both'],
      '02_amendment_signed.txt': ['amendment', 'STN-101', 'signed_both'],
      '03_contract.txt': ['contract', 'STN-102', 'signed_both'],
      '04_contract.txt': ['contract', 'STN-103', 'signed_both'],
      '05_supplier_email.txt': ['letter', 'STN-102', 'unsigned'],
      '06_amendment_draft.txt': ['draft', 'STN-101', 'unsigned'],
    })
    expect(result.documents.find((d) => d.docType === 'amendment')?.effectiveDate).toBe('2026-03-01')
  })

  it('STN-101: amount and term changed by the signed amendment, originals kept, draft pending', () => {
    const c = findContract(result, 'STN-101')!
    expect(c.fields.supplier.value).toBe('ООО «Вектор Прибор»')
    expect(c.fields.amount).toMatchObject({ value: 1_380_000, status: 'ok', original: 1_200_000, clause: '2.1' })
    expect(c.fields.amount.changedBy?.fileName).toBe('02_amendment_signed.txt')
    expect(c.fields.amount.evidence[0].fileName).toBe('02_amendment_signed.txt')
    expect(c.fields.amount.originalEvidence?.[0].quote).toContain('1 200 000')
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-04-30', status: 'ok', original: '2026-04-15', clause: '3.1' })
    expect(c.fields.deliveryDate.changedBy?.fileName).toBe('02_amendment_signed.txt')
    expect(c.fields.deliveryDate.originalEvidence?.[0].quote).toBe('Поставщик обязуется поставить оборудование не позднее 15.04.2026.')

    const pending = c.pendingChanges.map((p) => [p.field, p.proposedValue, p.fileName, p.reason])
    expect(pending).toEqual([
      ['amount', 1_450_000, '06_amendment_draft.txt', 'not_signed'],
      ['deliveryDate', '2026-05-10', '06_amendment_draft.txt', 'not_signed'],
    ])
    expect(c.needsReview).toBe(false)
  })

  it('STN-102: 840 000 (not the 252 000 advance), 20.03.2026 (not the 10.04.2026 payment date), letter pending', () => {
    const c = findContract(result, 'STN-102')!
    expect(c.fields.amount).toMatchObject({ value: 840_000, status: 'ok', clause: '2.1' })
    expect(c.fields.amount.changedBy).toBeUndefined()
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-03-20', status: 'ok', clause: '3.1' })
    expect(c.pendingChanges).toHaveLength(1)
    expect(c.pendingChanges[0]).toMatchObject({
      field: 'deliveryDate',
      proposedValue: '2026-03-27',
      currentValue: '2026-03-20',
      fileName: '05_supplier_email.txt',
      docType: 'letter',
      reason: 'supplier_proposal',
    })
  })

  it('STN-103: amount is no_data with the quote saying so (not the 600 000 limit); term 30.04.2026', () => {
    const c = findContract(result, 'STN-103')!
    expect(c.fields.amount.value).toBeNull()
    expect(c.fields.amount.status).toBe('no_data')
    expect(c.fields.amount.evidence.map((e) => e.quote)).toEqual(['Числовое значение стоимости в тексте договора не указано.'])
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-04-30', status: 'ok' })
    expect(c.pendingChanges).toEqual([])
  })

  it('every quote is an exact substring of its file', () => {
    expect(quoteErrors(result)).toEqual([])
  })

  it('answers the four user questions', () => {
    const q1 = deliveryTermOnDate(result, 'STN-101')
    expect(q1.field?.value).toBe('2026-04-30')
    expect(q1.text).toContain('30.04.2026')
    expect(q1.text).toContain('02_amendment_signed.txt')

    expect(contractAmount(result, 'STN-102').field?.value).toBe(840_000)

    const q3 = contractAmount(result, 'STN-103')
    expect(q3.field?.status).toBe('no_data')
    expect(q3.text).toContain('нет данных — В договоре сказано, что стоимость не указана')

    const q4 = contractsDueBefore(result, new Date(2026, 3, 1))
    expect(q4.items.map((i) => i.contract.number)).toEqual(['STN-102'])
    expect(q4.items[0].hasUnapprovedDeliveryChange).toBe(true)
    expect(q4.items[0].pendingDeliveryChanges[0].proposedValue).toBe('2026-03-27')
    expect(q4.undetermined).toEqual([])
  })

  it('reports an unknown contract number instead of guessing', () => {
    const q = contractAmount(result, 'STN-999')
    expect(q.contract).toBeNull()
    expect(q.field).toBeNull()
  })
})
