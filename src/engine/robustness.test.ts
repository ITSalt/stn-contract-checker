// Robustness: fixtures are built from a template of the same general format, not copies of documents/.
import { describe, expect, it } from 'vitest'
import { analyze, contractsDueBefore, findContract } from './index'
import type { AnalysisResult, InputFile } from './types'
import { loadDocuments, quoteErrors } from '../test/evidence'

const CHECK_DATE = new Date(2026, 2, 10)

interface ContractSpec {
  number: string
  date?: string
  status?: string
  supplier?: string
  amount?: string | null
  delivery?: string | null
  deliveryClause?: string
  extra?: string
}

function contract(spec: ContractSpec): string {
  const date = spec.date ?? '15.01.2026'
  const lines = [
    `ДОГОВОР ПОСТАВКИ № ${spec.number}`,
    `Дата: ${date}`,
    `Статус: ${spec.status ?? `подписан обеими сторонами ${date}.`}`,
    '',
    `1.1. Покупатель: ООО «СеверМет». Поставщик: ${spec.supplier ?? 'ООО «Тест Поставка»'}.`,
    '1.2. Предмет: поставка лабораторного оборудования.',
    '',
  ]
  if (spec.amount !== null) {
    lines.push(`2.1. Общая стоимость поставки составляет ${spec.amount ?? '500 000'} рублей, включая НДС. Указанная сумма — итоговая стоимость договора.`)
    lines.push('2.2. Авансовый платеж составляет 100 000 рублей и входит в общую стоимость по пункту 2.1.')
  }
  lines.push('')
  if (spec.deliveryClause) lines.push(spec.deliveryClause)
  else if (spec.delivery !== null) lines.push(`3.1. Поставщик обязуется поставить оборудование не позднее ${spec.delivery ?? '15.05.2026'}.`)
  lines.push('3.2. Оплата производится не позднее 01.07.2026. Этот срок является сроком оплаты, а не поставки.')
  if (spec.extra) lines.push(spec.extra)
  lines.push('', '5.1. Изменения условий действуют после подписания дополнительного соглашения обеими сторонами и наступления указанной в нем даты вступления в силу.')
  return lines.join('\n')
}

interface AmendmentSpec {
  contract: string
  no?: number
  date?: string
  status?: string
  effective?: string | null
  amount?: string
  delivery?: string
}

function amendment(spec: AmendmentSpec): string {
  const date = spec.date ?? '01.03.2026'
  const lines = [
    `ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № ${spec.no ?? 1} К ДОГОВОРУ ${spec.contract}`,
    `Дата: ${date}`,
    `Статус: ${spec.status ?? `подписано обеими сторонами ${date}.`}`,
    '',
  ]
  let n = 1
  if (spec.amount) {
    lines.push(`${n++}. Пункт 2.1 договора изложить в следующей редакции: «Общая стоимость поставки составляет ${spec.amount} рублей, включая НДС. Указанная сумма — итоговая стоимость договора».`, '')
  }
  if (spec.delivery) {
    lines.push(`${n++}. Пункт 3.1 договора изложить в следующей редакции: «Поставщик обязуется поставить оборудование не позднее ${spec.delivery}».`, '')
  }
  lines.push(`${n++}. Остальные условия договора остаются без изменений.`, '')
  if (spec.effective !== null) lines.push(`${n}. Настоящее соглашение вступает в силу ${spec.effective ?? date}.`)
  return lines.join('\n')
}

function letter(contractNumber: string, from: string, oldDate: string, newDate: string): string {
  return [
    'ПИСЬМО О ПЕРЕНОСЕ СРОКА',
    'Дата: 02.03.2026',
    `От: ${from}`,
    'Кому: ООО «СеверМет»',
    `Тема: договор ${contractNumber}`,
    '',
    `Просим по договору ${contractNumber} перенести срок поставки с ${oldDate} на ${newDate}.`,
  ].join('\n')
}

/** Result without file names, for comparing analyses of renamed files. */
function contractsWithout(result: AnalysisResult, rename: Record<string, string>): string {
  let json = JSON.stringify(result.contracts)
  for (const [from, to] of Object.entries(rename)) json = json.split(JSON.stringify(from)).join(JSON.stringify(to))
  return json
}

describe('new contract of the same format', () => {
  const files: InputFile[] = [
    ...loadDocuments(),
    { name: 'new.txt', text: contract({ number: 'STN-204', supplier: 'АО «Новый Ресурс»', amount: '2 750 500', delivery: '05.06.2026' }) },
  ]
  const result = analyze(files, CHECK_DATE)

  it('extracts supplier, amount and term from the text', () => {
    const c = findContract(result, 'STN-204')!
    expect(c.fields.number.value).toBe('STN-204')
    expect(c.fields.supplier.value).toBe('АО «Новый Ресурс»')
    expect(c.fields.amount).toMatchObject({ value: 2_750_500, status: 'ok' })
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-06-05', status: 'ok' })
    expect(result.contracts).toHaveLength(4)
    expect(quoteErrors(result)).toEqual([])
  })

  it('a contract due before the threshold appears in question 4', () => {
    const r = analyze([{ name: 'x.txt', text: contract({ number: 'STN-205', delivery: '25.03.2026' }) }], CHECK_DATE)
    const q4 = contractsDueBefore(r, new Date(2026, 3, 1))
    expect(q4.items.map((i) => [i.contract.number, i.deliveryDate, i.hasUnapprovedDeliveryChange])).toEqual([['STN-205', '2026-03-25', false]])
  })
})

describe('changed field in a training contract', () => {
  it('uses the new amount and term from the text, not remembered values', () => {
    const files = loadDocuments().map((f) =>
      f.text.includes('№ STN-102') ? { ...f, text: f.text.replace('840 000 (восемьсот сорок тысяч)', '910 000 (девятьсот десять тысяч)').replace('20.03.2026', '18.03.2026') } : f,
    )
    const result = analyze(files, CHECK_DATE)
    const c = findContract(result, 'STN-102')!
    expect(c.fields.amount.value).toBe(910_000)
    expect(c.fields.deliveryDate.value).toBe('2026-03-18')
    expect(quoteErrors(result)).toEqual([])
  })

  it('changed amount in the amended contract keeps the amendment value and the new original', () => {
    const files = loadDocuments().map((f) => (f.text.includes('№ STN-101') ? { ...f, text: f.text.replace('1 200 000', '1 250 000') } : f))
    const c = findContract(analyze(files, CHECK_DATE), 'STN-101')!
    expect(c.fields.amount).toMatchObject({ value: 1_380_000, original: 1_250_000 })
  })
})

describe('file names and upload order do not matter', () => {
  const docs = loadDocuments()
  const base = analyze(docs, CHECK_DATE)

  it('reverse upload order gives the same contracts', () => {
    expect(JSON.stringify(analyze([...docs].reverse(), CHECK_DATE).contracts)).toBe(JSON.stringify(base.contracts))
  })

  it('renamed files (misleading names and dates) give the same contracts', () => {
    const names = ['zz_signed_2027.txt', 'a_draft.txt', 'contract_final.txt', '2025_old.txt', 'amendment_signed.txt', '00_main.txt']
    const rename: Record<string, string> = {}
    const renamed = docs.map((f, i) => {
      rename[names[i]] = f.name
      return { name: names[i], text: f.text }
    })
    const result = analyze(renamed.reverse(), CHECK_DATE)
    expect(contractsWithout(result, rename)).toBe(JSON.stringify(base.contracts))
  })
})

describe('check date and amendment status', () => {
  it('at 28.02.2026 the amendment is not yet effective: original values, amendment pending', () => {
    const result = analyze(loadDocuments(), new Date(2026, 1, 28))
    const c = findContract(result, 'STN-101')!
    expect(c.fields.amount).toMatchObject({ value: 1_200_000, status: 'ok' })
    expect(c.fields.amount.changedBy).toBeUndefined()
    expect(c.fields.deliveryDate.value).toBe('2026-04-15')
    const fromAmendment = c.pendingChanges.filter((p) => p.docType === 'amendment')
    expect(fromAmendment.map((p) => [p.field, p.proposedValue, p.reason])).toEqual([
      ['amount', 1_380_000, 'not_effective'],
      ['deliveryDate', '2026-04-30', 'not_effective'],
    ])
    expect(c.pendingChanges.filter((p) => p.docType === 'draft')).toHaveLength(2)
  })

  const contractText = contract({ number: 'STN-210', amount: '700 000', delivery: '20.04.2026' })

  it('signed amendment with a future effective date is not applied', () => {
    const result = analyze(
      [
        { name: 'c.txt', text: contractText },
        { name: 'a.txt', text: amendment({ contract: 'STN-210', date: '05.03.2026', effective: '01.04.2026', delivery: '30.05.2026' }) },
      ],
      CHECK_DATE,
    )
    const c = findContract(result, 'STN-210')!
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-04-20', status: 'ok' })
    expect(c.pendingChanges).toMatchObject([{ field: 'deliveryDate', proposedValue: '2026-05-30', reason: 'not_effective', effectiveDate: '2026-04-01' }])
    expect(c.needsReview).toBe(false)
  })

  it('amendment signed by one party only is pending; unclear signature needs review', () => {
    const oneSide = amendment({ contract: 'STN-210', status: 'не подписано покупателем.', amount: '750 000' })
    const unclear = amendment({ contract: 'STN-210', status: 'подписано поставщиком 01.03.2026.', amount: '760 000' })
    const r1 = findContract(analyze([{ name: 'c.txt', text: contractText }, { name: 'a.txt', text: oneSide }], CHECK_DATE), 'STN-210')!
    expect(r1.fields.amount.value).toBe(700_000)
    expect(r1.pendingChanges[0]).toMatchObject({ proposedValue: 750_000, reason: 'not_signed' })
    const r2 = findContract(analyze([{ name: 'c.txt', text: contractText }, { name: 'a.txt', text: unclear }], CHECK_DATE), 'STN-210')!
    expect(r2.fields.amount.value).toBe(700_000)
    expect(r2.pendingChanges[0]).toMatchObject({ proposedValue: 760_000, reason: 'unclear_signature' })
    expect(r2.needsReview).toBe(true)
    expect(r2.issues.map((i) => i.code)).toContain('unclear_signature')
  })

  it('signed amendment without an effective date is not applied and needs review', () => {
    const r = findContract(
      analyze([{ name: 'c.txt', text: contractText }, { name: 'a.txt', text: amendment({ contract: 'STN-210', effective: null, amount: '800 000' }) }], CHECK_DATE),
      'STN-210',
    )!
    expect(r.fields.amount.value).toBe(700_000)
    expect(r.pendingChanges[0].reason).toBe('no_effective_date')
    expect(r.needsReview).toBe(true)
  })

  it('two effective amendments changing the same field need review', () => {
    const result = analyze(
      [
        { name: 'c.txt', text: contractText },
        { name: 'a1.txt', text: amendment({ contract: 'STN-210', no: 1, date: '01.02.2026', amount: '710 000' }) },
        { name: 'a2.txt', text: amendment({ contract: 'STN-210', no: 2, date: '01.03.2026', amount: '720 000' }) },
      ],
      CHECK_DATE,
    )
    const c = findContract(result, 'STN-210')!
    expect(c.fields.amount.status).toBe('needs_review')
    expect(c.fields.amount.value).toBeNull()
    expect(c.fields.amount.evidence.map((e) => e.fileName).sort()).toEqual(['a1.txt', 'a2.txt'])
    expect(c.issues.map((i) => i.code)).toContain('amendment_conflict')
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-04-20', status: 'ok' })
  })

  it('letter from someone other than the supplier is shown as letter information', () => {
    const c = findContract(
      analyze([{ name: 'c.txt', text: contractText }, { name: 'l.txt', text: letter('STN-210', 'ООО «Посредник»', '20.04.2026', '25.04.2026') }], CHECK_DATE),
      'STN-210',
    )!
    expect(c.fields.deliveryDate.value).toBe('2026-04-20')
    expect(c.pendingChanges).toMatchObject([{ proposedValue: '2026-04-25', reason: 'letter' }])
  })
})

describe('linking problems', () => {
  it('amendment to a contract that was not uploaded needs review', () => {
    const result = analyze(
      [
        { name: 'c.txt', text: contract({ number: 'STN-220' }) },
        { name: 'a.txt', text: amendment({ contract: 'STN-299', amount: '900 000' }) },
      ],
      CHECK_DATE,
    )
    expect(result.issues).toMatchObject([{ code: 'missing_contract', fileNames: ['a.txt'] }])
    expect(result.issues[0].message).toContain('STN-299')
    expect(findContract(result, 'STN-220')!.fields.amount.value).toBe(500_000)
    expect(result.documents.find((d) => d.fileName === 'a.txt')?.linkedContract).toBeNull()
  })

  it('document without a contract number needs review', () => {
    const result = analyze([{ name: 'x.txt', text: 'Служебная записка\nПросим ускорить поставку.' }], CHECK_DATE)
    expect(result.contracts).toEqual([])
    expect(result.issues.map((i) => i.code)).toEqual(['unknown_document'])
  })

  it('duplicate contract number needs review; different values are not chosen silently', () => {
    const result = analyze(
      [
        { name: 'c1.txt', text: contract({ number: 'STN-230', amount: '300 000' }) },
        { name: 'c2.txt', text: contract({ number: 'STN-230', amount: '350 000' }) },
      ],
      CHECK_DATE,
    )
    expect(result.contracts).toHaveLength(1)
    const c = result.contracts[0]
    expect(c.issues.map((i) => i.code)).toContain('duplicate_contract')
    expect(c.fields.amount).toMatchObject({ value: null, status: 'needs_review' })
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-05-15', status: 'ok' })
  })
})

describe('missing and unparsable values', () => {
  it('contract without a delivery clause → no_data without quote', () => {
    const c = findContract(analyze([{ name: 'c.txt', text: contract({ number: 'STN-240', delivery: null }) }], CHECK_DATE), 'STN-240')!
    expect(c.fields.deliveryDate).toMatchObject({ value: null, status: 'no_data', evidence: [] })
    expect(c.fields.amount.value).toBe(500_000)
  })

  it('contract without a price clause → no_data, the 100 000 advance is not taken', () => {
    const c = findContract(analyze([{ name: 'c.txt', text: contract({ number: 'STN-241', amount: null }) }], CHECK_DATE), 'STN-241')!
    expect(c.fields.amount).toMatchObject({ value: null, status: 'no_data' })
  })

  it('delivery term given as a period, not a date → needs_review with the quote', () => {
    const c = findContract(
      analyze(
        [{ name: 'c.txt', text: contract({ number: 'STN-242', deliveryClause: '3.1. Поставщик обязуется поставить оборудование в течение 30 дней с даты подписания договора.' }) }],
        CHECK_DATE,
      ),
      'STN-242',
    )!
    expect(c.fields.deliveryDate.status).toBe('needs_review')
    expect(c.fields.deliveryDate.value).toBeNull()
    expect(c.fields.deliveryDate.evidence[0].quote).toContain('в течение 30 дней')
    expect(c.needsReview).toBe(true)
  })

  it('explicit «not specified» term → no_data with the quote', () => {
    const c = findContract(
      analyze([{ name: 'c.txt', text: contract({ number: 'STN-243', deliveryClause: '3.1. Срок поставки в тексте договора не указан.' }) }], CHECK_DATE),
      'STN-243',
    )!
    expect(c.fields.deliveryDate).toMatchObject({ value: null, status: 'no_data' })
    expect(c.fields.deliveryDate.evidence[0].quote).toBe('Срок поставки в тексте договора не указан.')
  })

  it('all quotes in fixtures are exact substrings, also with CRLF line endings', () => {
    const crlf = (s: string) => s.replace(/\n/g, '\r\n')
    const result = analyze(
      [
        { name: 'c.txt', text: crlf(contract({ number: 'STN-250', amount: '1 000 000' })) },
        { name: 'a.txt', text: crlf(amendment({ contract: 'STN-250', amount: '1 100 000', delivery: '01.06.2026' })) },
        { name: 'l.txt', text: crlf(letter('STN-250', 'ООО «Тест Поставка»', '01.06.2026', '10.06.2026')) },
      ],
      CHECK_DATE,
    )
    const c = result.contracts[0]
    expect(c.fields.amount.value).toBe(1_100_000)
    expect(c.fields.deliveryDate.value).toBe('2026-06-01')
    expect(c.pendingChanges).toMatchObject([{ proposedValue: '2026-06-10', reason: 'supplier_proposal' }])
    expect(quoteErrors(result)).toEqual([])
  })
})

describe('one field changed in the training documents (demo-like edits)', () => {
  const edit = (marker: string, from: string, to: string) =>
    loadDocuments().map((f) => (f.text.includes(marker) ? { ...f, text: f.text.replace(from, to) } : f))

  it('amendment effective date moved after the check date → not applied', () => {
    const result = analyze(edit('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № 1', 'вступает в силу 01.03.2026', 'вступает в силу 15.03.2026'), CHECK_DATE)
    const c = findContract(result, 'STN-101')!
    expect([c.fields.amount.value, c.fields.deliveryDate.value]).toEqual([1_200_000, '2026-04-15'])
    expect(c.pendingChanges.filter((p) => p.reason === 'not_effective')).toHaveLength(2)
  })

  it('amendment status changed to unsigned → not applied', () => {
    const result = analyze(edit('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № 1', 'подписано обеими сторонами 01.03.2026', 'не подписано'), CHECK_DATE)
    expect(findContract(result, 'STN-101')!.fields.amount.value).toBe(1_200_000)
  })

  it('amendment signed after the check date with a retroactive effective date → not applied', () => {
    const result = analyze(edit('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № 1', 'подписано обеими сторонами 01.03.2026', 'подписано обеими сторонами 12.03.2026'), CHECK_DATE)
    const c = findContract(result, 'STN-101')!
    expect(c.fields.amount.value).toBe(1_200_000)
    expect(c.pendingChanges.find((p) => p.docType === 'amendment')?.reason).toBe('not_effective')
  })

  it('letter now refers to another uploaded contract → pending moves there', () => {
    const files = loadDocuments().map((f) => (f.text.startsWith('ПИСЬМО') ? { ...f, text: f.text.replaceAll('STN-102', 'STN-103') } : f))
    const result = analyze(files, CHECK_DATE)
    expect(findContract(result, 'STN-102')!.pendingChanges).toEqual([])
    expect(findContract(result, 'STN-103')!.pendingChanges).toMatchObject([{ proposedValue: '2026-03-27', reason: 'letter' }])
  })

  it('STN-103 gets a numeric price → it is used', () => {
    const result = analyze(edit('№ STN-103', 'Числовое значение стоимости в тексте договора не указано.', 'Общая стоимость поставки составляет 575 000 рублей.'), CHECK_DATE)
    expect(findContract(result, 'STN-103')!.fields.amount).toMatchObject({ value: 575_000, status: 'ok' })
  })
})
