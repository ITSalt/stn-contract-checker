// Fixes from the three-client browser acceptance (D-12): each test runs on the scenario input
// (src/test/acceptance/scenarios.json) and checks the expectation from FIX-PLAN.md section A.
import { describe, expect, it } from 'vitest'
import { analyze, contractAmount, contractsDueBefore, deliveryTermOnDate, findContract } from './index'
import { amountField } from './fields/amount'
import { findMoney } from './text'
import type { AnalysisResult, InputFile } from './types'
import { scenarioFiles } from '../test/acceptance'
import { loadDocuments, quoteErrors } from '../test/evidence'

const CHECK = '2026-03-10'
const contractOf = (r: AnalysisResult, n: string) => findContract(r, n)!
const issueCodes = (r: AnalysisResult, n: string) => contractOf(r, n).issues.map((i) => i.code)

function run(files: InputFile[], date = CHECK): AnalysisResult {
  const result = analyze(files, date)
  expect(quoteErrors(result)).toEqual([])
  return result
}

describe('D-1 (C-08): «увеличить … на X … до Y» takes Y, never the increment', () => {
  it('C-08: STN-101 amount is 1 380 000,50 from the amendment', () => {
    const r = run(scenarioFiles('C-08'))
    const amount = contractOf(r, 'STN-101').fields.amount
    expect(amount).toMatchObject({ value: 1_380_000.5, status: 'ok', original: 1_200_000 })
    expect(amount.changedBy?.fileName).toBe('02_amendment_signed.txt')
    expect(amount.evidence.some((e) => e.quote.includes('до 1 380 000,50 рублей'))).toBe(true)
    expect(contractOf(r, 'STN-101').fields.deliveryDate).toMatchObject({ value: '2026-04-30', status: 'ok' })
  })

  it('an increase without a resulting amount is not a value; «до Y» wins over «на X»', () => {
    expect(amountField.matchProposal!('Стороны договорились увеличить стоимость поставки на 50 000 рублей.')).toMatchObject([{ kind: 'unparsed' }])
    expect(amountField.matchProposal!('Стороны договорились уменьшить стоимость поставки на 50 000 рублей до 790 000 рублей.')).toMatchObject([
      { kind: 'value', value: 790_000 },
    ])
  })

  it('kopeks written as «рублей 50 копеек» are kept', () => {
    expect(findMoney('180 000 (сто восемьдесят тысяч) рублей 50 копеек').map((m) => m.value)).toEqual([180_000.5])
  })
})

describe('D-2 (C-05, D-13): the latest effective amendment wins, evidence keeps the chain', () => {
  it('C-05 on 10.03: term 20.05 from the second amendment, amount 1 380 000 from the first, no conflict', () => {
    const r = run(scenarioFiles('C-05'))
    const c = contractOf(r, 'STN-101')
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-05-20', status: 'ok' })
    expect(c.fields.deliveryDate.changedBy?.fileName).toBe('00_first.txt')
    expect(c.fields.deliveryDate.evidence.map((e) => e.fileName)).toEqual(['a_last.txt', '00_first.txt'])
    expect(c.fields.amount).toMatchObject({ value: 1_380_000, status: 'ok' })
    expect(c.fields.amount.changedBy?.fileName).toBe('a_last.txt')
    expect(c.issues.map((i) => i.code)).not.toContain('amendment_conflict')
  })

  it('C-05 on 02.03: term 30.04, the second amendment is pending as not effective', () => {
    const c = contractOf(run(scenarioFiles('C-05'), '2026-03-02'), 'STN-101')
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-04-30', status: 'ok' })
    expect(c.pendingChanges).toEqual(expect.arrayContaining([expect.objectContaining({ fileName: '00_first.txt', reason: 'not_effective', proposedValue: '2026-05-20' })]))
  })

  it('C-05 with swapped file names gives the same result', () => {
    const files = scenarioFiles('C-05').map((f) => ({ ...f, name: f.name === '00_first.txt' ? 'a_last.txt' : f.name === 'a_last.txt' ? '00_first.txt' : f.name }))
    const c = contractOf(run(files), 'STN-101')
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-05-20', status: 'ok' })
    expect(c.fields.deliveryDate.changedBy?.fileName).toBe('a_last.txt')
    expect(c.fields.amount).toMatchObject({ value: 1_380_000, status: 'ok' })
  })

  it('C-07 regression: an amendment changing payment, acceptance and penalty does not touch amount or term', () => {
    const r = run(scenarioFiles('C-07'))
    const c = contractOf(r, 'STN-101')
    expect(c.fields.amount).toMatchObject({ value: 1_380_000, status: 'ok' })
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-04-30', status: 'ok' })
    expect(c.fields.deliveryDate.changedBy?.fileName).toBe('02_amendment_signed.txt')
    expect(c.issues).toEqual([])
    expect(c.infoDocuments.map((d) => d.fileName)).toEqual(['07_amendment_3.txt'])
    expect(contractsDueBefore(r, '2026-04-01').items.map((i) => i.contract.number)).toEqual(['STN-102'])
  })

  it('an effective amendment touching the term clause without a recognizable value needs review', () => {
    const files = [
      ...loadDocuments().filter((f) => f.name === '01_contract.txt'),
      {
        name: 'a.txt',
        text: [
          'ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № 1 К ДОГОВОРУ STN-101',
          'Дата: 01.03.2026',
          'Статус: подписано обеими сторонами 01.03.2026.',
          '',
          '1. Пункт 3.1 договора дополнить словами «с правом досрочной поставки по согласованию сторон».',
          '',
          '2. Остальные условия договора остаются без изменений.',
          '',
          '3. Настоящее соглашение вступает в силу 01.03.2026.',
        ].join('\n'),
      },
    ]
    const c = contractOf(run(files), 'STN-101')
    expect(c.fields.deliveryDate.status).toBe('needs_review')
    expect(c.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unparsed_value', field: 'deliveryDate' })]))
    expect(c.fields.amount).toMatchObject({ value: 1_200_000, status: 'ok' })
  })
})

describe('D-5 (L-14, A-6): amendment without an effective date marks its fields for review', () => {
  it('L-14: STN-101 keeps contract values with needs_review naming the amendment', () => {
    const r = run(scenarioFiles('L-14'))
    const c = contractOf(r, 'STN-101')
    expect(c.fields.amount).toMatchObject({ value: 1_200_000, status: 'needs_review' })
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-04-15', status: 'needs_review' })
    expect(c.fields.amount.reason).toContain('02_amendment_signed.txt')
    expect(c.fields.deliveryDate.reason).toContain('02_amendment_signed.txt')
    expect(contractOf(r, 'STN-102').fields.deliveryDate).toMatchObject({ value: '2026-03-20', status: 'ok' })
    // Term through an appendix that is not uploaded: no date is invented (accepted by the client).
    expect(contractOf(r, 'STN-103').fields.deliveryDate).toMatchObject({ value: null, status: 'needs_review' })
  })

  it('L-14 after removing the amendment: both fields ok, no review', () => {
    const c = contractOf(run(scenarioFiles('L-14').filter((f) => f.name !== '02_amendment_signed.txt')), 'STN-101')
    expect(c.fields.amount).toMatchObject({ value: 1_200_000, status: 'ok' })
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-04-15', status: 'ok' })
    expect(c.needsReview).toBe(false)
  })

  it('C-03 (D-16): an amendment signed by the supplier only keeps contract values for review', () => {
    const c = contractOf(run(scenarioFiles('C-03')), 'STN-101')
    expect(c.fields.amount).toMatchObject({ value: 1_200_000, status: 'needs_review' })
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-04-15', status: 'needs_review' })
    expect(c.pendingChanges.filter((p) => p.fileName === '02_amendment_signed.txt').map((p) => p.reason)).toEqual(['unclear_signature', 'unclear_signature'])
  })

  it('unclear signature also marks the changed field for review', () => {
    const docs = loadDocuments().filter((f) => f.name === '01_contract.txt' || f.name === '02_amendment_signed.txt')
    const files = docs.map((f) => (f.name === '02_amendment_signed.txt' ? { ...f, text: f.text.replace(/Статус:.*\n/, 'Статус: подписано поставщиком 01.03.2026.\n') } : f))
    const c = contractOf(run(files), 'STN-101')
    expect(c.fields.amount).toMatchObject({ value: 1_200_000, status: 'needs_review' })
    expect(c.pendingChanges[0].reason).toBe('unclear_signature')
  })
})

describe('D-4 (C-14, C-15, A-6): letters are never lost', () => {
  it('C-14: the buyer letter is pending at 27.03, the term stays 20.03 and STN-102 is in Q4', () => {
    const r = run(scenarioFiles('C-14'))
    const c = contractOf(r, 'STN-102')
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-03-20', status: 'ok' })
    const pending = c.pendingChanges.filter((p) => p.field === 'deliveryDate').map((p) => [p.fileName, p.proposedValue, p.reason])
    expect(pending).toEqual(expect.arrayContaining([['07_buyer_letter.txt', '2026-03-27', 'letter'], ['05_supplier_email.txt', '2026-03-27', 'supplier_proposal']]))
    expect(contractsDueBefore(r, '2026-04-01').items.map((i) => i.contract.number)).toEqual(['STN-102'])
  })

  it('C-15: the letter about an amendment that is not uploaded is pending and flagged, the term stays ok', () => {
    const r = run(scenarioFiles('C-15'))
    const c = contractOf(r, 'STN-102')
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-03-20', status: 'ok' })
    expect(c.pendingChanges).toEqual(expect.arrayContaining([expect.objectContaining({ fileName: 'dopsoglashenie_STN-102_signed.txt', proposedValue: '2026-04-15' })]))
    expect(c.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unconfirmed_amendment', fileNames: ['dopsoglashenie_STN-102_signed.txt'] })]))
    const q4 = contractsDueBefore(r, '2026-04-01')
    expect(q4.items.map((i) => i.contract.number)).toEqual(['STN-102'])
  })

  it('no unconfirmed_amendment when the letter says «не подписано» or the amendment is uploaded', () => {
    const base = loadDocuments().filter((f) => f.name === '03_contract.txt')
    const unsigned = ['ПИСЬМО ПОСТАВЩИКА', 'Дата: 05.03.2026', 'От: ООО «Контур Электро»', 'Тема: договор STN-102', '', 'Дополнительное соглашение № 1 к договору STN-102 не подписано обеими сторонами.'].join('\n')
    expect(issueCodes(run([...base, { name: 'l.txt', text: unsigned }]), 'STN-102')).not.toContain('unconfirmed_amendment')
    const amendment = [
      'ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № 1 К ДОГОВОРУ STN-102',
      'Дата: 07.03.2026',
      'Статус: подписано обеими сторонами 07.03.2026.',
      '',
      '1. Пункт 3.1 договора изложить в следующей редакции: «Поставщик обязуется поставить комплектующие не позднее 15.04.2026».',
      '',
      '2. Настоящее соглашение вступает в силу 07.03.2026.',
    ].join('\n')
    const files = [...scenarioFiles('C-15'), { name: 'a1.txt', text: amendment }]
    const r = run(files)
    expect(issueCodes(r, 'STN-102')).not.toContain('unconfirmed_amendment')
    expect(contractOf(r, 'STN-102').fields.deliveryDate).toMatchObject({ value: '2026-04-15', status: 'ok' })
  })

  it('a linked letter without changes is listed in infoDocuments with an exact quote', () => {
    const text = ['ПИСЬМО ПОКУПАТЕЛЯ', 'Дата: 05.03.2026', 'От: ООО «СеверМет»', 'Кому: ООО «Контур Электро»', 'Тема: договор STN-102', '', 'Просим сообщить статус поставки по договору STN-102.'].join('\n')
    const files = [...loadDocuments().filter((f) => f.name === '03_contract.txt'), { name: 'ask.txt', text }]
    const c = contractOf(run(files), 'STN-102')
    expect(c.infoDocuments).toHaveLength(1)
    const info = c.infoDocuments[0]
    expect(info).toMatchObject({ fileName: 'ask.txt', docType: 'letter' })
    expect(info.evidence.quote).toBe('Просим сообщить статус поставки по договору STN-102.')
    expect(text.slice(info.evidence.start, info.evidence.end)).toBe(info.evidence.quote)
    expect(c.needsReview).toBe(false)
  })
})

describe('D-5a (F-01): answers say when the contract row needs review', () => {
  it('F-01 duplicate copy: the Q1 answer mentions the row review', () => {
    const files = [...scenarioFiles('F-01'), { name: '01_contract (1).txt', text: scenarioFiles('F-01')[0].text }]
    const r = run(files)
    const answer = deliveryTermOnDate(r, 'STN-101')
    expect(answer.field?.status).toBe('ok')
    expect(answer.text).toContain('строка договора требует проверки')
    expect(answer.text).toContain('несколько договоров')
  })
})

describe('D-6 (C-18, F-08, A-6): check date before the contract was signed', () => {
  it('C-18 on 07.02: STN-102 and STN-103 are not concluded, values kept for review', () => {
    const r = run(scenarioFiles('C-18'), '2026-02-07')
    expect(issueCodes(r, 'STN-102')).toContain('not_concluded')
    expect(issueCodes(r, 'STN-103')).toContain('not_concluded')
    expect(issueCodes(r, 'STN-101')).not.toContain('not_concluded')
    expect(contractOf(r, 'STN-102').fields.amount).toMatchObject({ value: 840_000, status: 'needs_review' })
    expect(contractOf(r, 'STN-103').fields.amount.status).toBe('no_data')
    expect(contractAmount(r, 'STN-102').text).toContain('не заключён')
    const letter = contractOf(r, 'STN-102').pendingChanges.find((p) => p.fileName === '05_supplier_email.txt')!
    expect(letter.reasonText).toContain('позже даты проверки')
  })

  it('F-08 on 01.01.1900: every contract is not concluded; STN-101 keeps 1 200 000 and 15.04', () => {
    const r = run(loadDocuments(), '1900-01-01')
    for (const n of ['STN-101', 'STN-102', 'STN-103']) expect(issueCodes(r, n)).toContain('not_concluded')
    expect(contractOf(r, 'STN-101').fields.amount).toMatchObject({ value: 1_200_000, status: 'needs_review' })
    expect(contractOf(r, 'STN-101').fields.deliveryDate).toMatchObject({ value: '2026-04-15', status: 'needs_review' })
  })
})

describe('D-9 (C-09, C-10, D-15): amount formats and foreign currency', () => {
  it('C-09: kopeks, dot separators and «тыс. руб.» are exact amounts; the advance is never taken', () => {
    const r = run(scenarioFiles('C-09'))
    const amount = (n: string) => contractOf(r, n).fields.amount
    expect(amount('STN-104')).toMatchObject({ value: 1_250_000.5, status: 'ok' })
    expect(amount('STN-105')).toMatchObject({ value: 1_200_000, status: 'ok' })
    expect(amount('STN-105').evidence[0].quote).toContain('1.200.000')
    expect(amount('STN-106')).toMatchObject({ value: 1_200_000, status: 'ok' })
    expect(amount('STN-106').evidence[0].quote).toContain('1 200 тыс. руб.')
    for (const n of ['STN-104', 'STN-105', 'STN-106']) {
      expect(contractOf(r, n).fields.deliveryDate).toMatchObject({ value: '2026-03-20', status: 'ok' })
      expect(amount(n).value).not.toBe(252_000)
    }
  })

  it('C-10: a price in US dollars needs review with the original amount in the reason', () => {
    const r = run(scenarioFiles('C-10'))
    const amount = contractOf(r, 'STN-107').fields.amount
    expect(amount).toMatchObject({ value: null, status: 'needs_review' })
    expect(amount.reason).toContain('15 000 (пятнадцать тысяч) долларов США')
    expect(amount.evidence[0]).toMatchObject({ fileName: 'dog_107.txt' })
    expect(amount.evidence[0].quote).toContain('долларов США')
    expect(contractOf(r, 'STN-101').fields.amount).toMatchObject({ value: 1_200_000, status: 'ok' })
    expect(contractOf(r, 'STN-101').fields.deliveryDate).toMatchObject({ value: '2026-04-15', status: 'ok' })
  })

  it('dates and ambiguous «1.200 руб.» are not amounts', () => {
    expect(findMoney('10.02.2026')).toEqual([])
    expect(findMoney('1.200 руб.')).toEqual([])
    expect(findMoney('1,5 млн руб.').map((m) => m.value)).toEqual([1_500_000])
  })
})

describe('reference set documents/ is unchanged by the fixes', () => {
  it('on 10.03.2026: no info documents, no not_concluded, Q4 is only STN-102', () => {
    const r = run(loadDocuments())
    for (const c of r.contracts) {
      expect(c.infoDocuments).toEqual([])
      expect(c.issues.map((i) => i.code)).not.toContain('not_concluded')
    }
    expect(contractOf(r, 'STN-102').needsReview).toBe(false)
    expect(contractsDueBefore(r, '2026-04-01').items.map((i) => i.contract.number)).toEqual(['STN-102'])
  })
})
