// Review round 1 (REVISE WP-APP-01): rewordings that must not produce invented values, boundaries, dates.
import { afterEach, describe, expect, it } from 'vitest'
import { amountField } from './fields/amount'
import { deliveryDateField } from './fields/deliveryDate'
import type { FieldExtractor } from './fields/types'
import { analyze, contractsDueBefore, findContract } from './index'
import { toCheckDate, toIsoDate } from './text'
import { loadDocuments } from '../test/evidence'

const kinds = (f: FieldExtractor, text: string) => f.match(text).map((h) => [h.kind, h.value ?? null])

const contract = (number: string, clauses: string[]) =>
  [`ДОГОВОР ПОСТАВКИ № ${number}`, 'Дата: 15.01.2026', 'Статус: подписан обеими сторонами 15.01.2026.', '', '1.1. Покупатель: ООО «СеверМет». Поставщик: ООО «Тест».', ...clauses].join('\n')

describe('H-1: payment share and price ceiling are not the contract price', () => {
  it('«первый платёж … 30% цены договора, т.е. 252 000 рублей» gives no value', () => {
    expect(kinds(amountField, 'Первый платёж составляет 30% цены договора, т.е. 252 000 рублей.')).toEqual([])
    const c = findContract(
      analyze([{ name: 'c.txt', text: contract('Q-1', ['2.1. Общая стоимость поставки составляет 840 000 рублей, включая НДС 20%.', '2.2. Первый платёж составляет 30% цены договора, т.е. 252 000 рублей.']) }], '2026-03-10'),
      'Q-1',
    )!
    expect(c.fields.amount).toMatchObject({ value: 840_000, status: 'ok' })
  })

  it('«максимальная стоимость — не более 600 000 рублей» with no price in 2.1 → needs_review with the quote', () => {
    const text = contract('Q-2', [
      '2.1. Общая стоимость определяется спецификацией. Числовое значение стоимости в тексте договора не указано.',
      '2.2. Максимальная стоимость договора — не более 600 000 рублей.',
    ])
    const c = findContract(analyze([{ name: 'c.txt', text }], '2026-03-10'), 'Q-2')!
    expect(c.fields.amount.value).toBeNull()
    expect(c.fields.amount.status).toBe('needs_review')
    expect(c.fields.amount.evidence.map((e) => e.quote)).toContain('Максимальная стоимость договора — не более 600 000 рублей.')
  })

  it.each([
    'Стоимость поставки не может превышать 600 000 рублей.',
    'Предельная цена договора — 600 000 рублей.',
    'Общая стоимость составляет 1 000 000 рублей и оплачивается частями.',
  ])('ceiling / partial payment wording → unparsed, not a value: %s', (text) => {
    expect(kinds(amountField, text).map(([k]) => k)).toEqual(['unparsed'])
  })

  it('VAT rate in percent does not hide the price', () => {
    expect(kinds(amountField, 'Общая стоимость поставки составляет 1 000 000 рублей, включая НДС 20%.')).toEqual([['value', 1_000_000]])
  })
})

describe('H-2: payment and acceptance in verb forms are not the delivery term', () => {
  it('«срок отгрузки … 20.03.2026» + «поставленный товар оплачивается не позднее 10.04.2026» → 20.03.2026', () => {
    expect(kinds(deliveryDateField, 'Поставленный товар оплачивается не позднее 10.04.2026.')).toEqual([])
    expect(kinds(deliveryDateField, 'Поставленный товар принимается покупателем до 15.04.2026.')).toEqual([])
    expect(kinds(deliveryDateField, 'Поставка товара оплачивается не позднее 10.04.2026.')).toEqual([])
    expect(kinds(deliveryDateField, 'Поставка принимается покупателем до 15.04.2026.')).toEqual([])
    expect(kinds(deliveryDateField, 'Поставщик обязуется поставить товар не позднее 15.04.2026, а покупатель оплатить его до 30.04.2026.').map(([k]) => k)).toEqual(['unparsed'])
    const text = contract('Q-3', ['3.1. Срок отгрузки товара — не позднее 20.03.2026.', '3.2. Поставленный товар оплачивается не позднее 10.04.2026.'])
    const c = findContract(analyze([{ name: 'c.txt', text }], '2026-03-10'), 'Q-3')!
    expect(c.fields.deliveryDate).toMatchObject({ value: '2026-03-20', status: 'ok' })
  })

  it('passive «должен быть поставлен» is still a delivery term', () => {
    expect(kinds(deliveryDateField, 'Товар должен быть поставлен не позднее 01.05.2026.')).toEqual([['value', '2026-05-01']])
  })
})

describe('M-1: boundaries', () => {
  it('amendment effective exactly on the check date is applied', () => {
    const c = findContract(analyze(loadDocuments(), '2026-03-01'), 'STN-101')!
    expect(c.fields.amount).toMatchObject({ value: 1_380_000, status: 'ok' })
    expect(c.fields.amount.changedBy?.fileName).toBe('02_amendment_signed.txt')
  })

  it('delivery equal to the threshold is not «earlier than» it', () => {
    const r = analyze([{ name: 'c.txt', text: contract('Q-4', ['3.1. Поставщик обязуется поставить товар не позднее 01.04.2026.']) }], '2026-03-10')
    expect(contractsDueBefore(r, '2026-04-01').items).toEqual([])
    expect(contractsDueBefore(r, '2026-04-02').items.map((i) => i.contract.number)).toEqual(['Q-4'])
  })

  it('contracts with unknown or unclear term go to undetermined', () => {
    const r = analyze(
      [
        { name: 'a.txt', text: contract('Q-5', ['2.1. Общая стоимость поставки составляет 100 000 рублей.']) },
        { name: 'b.txt', text: contract('Q-6', ['3.1. Поставка производится в течение 10 дней с даты подписания.']) },
      ],
      '2026-03-10',
    )
    const q4 = contractsDueBefore(r, '2026-04-01')
    expect(q4.items).toEqual([])
    expect(q4.undetermined.map((c) => [c.number, c.fields.deliveryDate.status])).toEqual([
      ['Q-5', 'no_data'],
      ['Q-6', 'needs_review'],
    ])
    expect(q4.text).toContain('Срок не определён: Q-5, Q-6')
  })
})

describe('M-2: check date as YYYY-MM-DD string, Date as local day', () => {
  const tz = process.env.TZ
  afterEach(() => {
    if (tz === undefined) delete process.env.TZ
    else process.env.TZ = tz
  })

  it('in a zone west of UTC the string keeps the day, a UTC-midnight Date does not', () => {
    process.env.TZ = 'America/Los_Angeles'
    // new Date('2026-03-01') is UTC midnight = 28.02 16:00 in Los Angeles: this is why the UI passes a string.
    expect(toIsoDate(new Date('2026-03-01'))).toBe('2026-02-28')
    expect(toIsoDate(new Date(2026, 2, 1))).toBe('2026-03-01')
    const r = analyze(loadDocuments(), '2026-03-01')
    expect(r.checkDate).toBe('2026-03-01')
    expect(findContract(r, 'STN-101')!.fields.amount.value).toBe(1_380_000)
    expect(findContract(analyze(loadDocuments(), new Date(2026, 2, 1)), 'STN-101')!.fields.amount.value).toBe(1_380_000)
  })

  it('rejects malformed date strings instead of guessing', () => {
    expect(toCheckDate('2026-03-10')).toBe('2026-03-10')
    expect(() => toCheckDate('10.03.2026')).toThrow(RangeError)
    expect(() => toCheckDate('2026-02-30')).toThrow(RangeError)
    expect(() => toCheckDate(new Date(Number.NaN))).toThrow(RangeError)
  })
})

describe('L-1/L-2: price sentences that fail filters are not «clause not found»', () => {
  it('«…включая НДС и аванс» → needs_review with the quote', () => {
    expect(kinds(amountField, 'Общая стоимость поставки составляет 1 000 000 рублей, включая НДС и аванс.').map(([k]) => k)).toEqual(['unparsed'])
  })

  it('«Стоимость по договору составляет …» is the price', () => {
    expect(kinds(amountField, 'Стоимость по договору составляет 900 000 рублей.')).toEqual([['value', 900_000]])
  })

  it('a ruble amount next to «стоимость» in an unrecognized wording → unparsed, not no_data', () => {
    expect(kinds(amountField, 'Согласованная стоимость: 500 000 рублей.').map(([k]) => k)).toEqual(['unparsed'])
  })

  it('«пени» only as a word: «пенетрометр» does not hide a price', () => {
    expect(kinds(amountField, 'Общая стоимость поставки пенетрометров составляет 50 000 рублей.')).toEqual([['value', 50_000]])
    expect(kinds(amountField, 'Пени составляют 0,1% стоимости поставки за день, но не более 10 000 рублей.')).toEqual([])
  })
})
