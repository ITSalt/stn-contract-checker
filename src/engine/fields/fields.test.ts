import { describe, expect, it } from 'vitest'
import { amountField } from './amount'
import { deliveryDateField } from './deliveryDate'
import { supplierField } from './supplier'
import type { FieldExtractor } from './types'

const values = (f: FieldExtractor, text: string) => f.match(text).map((h) => [h.kind, h.value ?? null, text.slice(h.start, h.end)])

describe('amount', () => {
  it('takes the total price', () => {
    expect(values(amountField, 'Общая стоимость поставки составляет 1 234 567,5 (…) рублей, включая НДС. Указанная сумма — итоговая стоимость договора.')).toEqual([
      ['value', 1_234_567.5, 'Общая стоимость поставки составляет 1 234 567,5 (…) рублей, включая НДС.'],
    ])
    expect(values(amountField, 'Цена договора составляет 99 000 ₽.')[0][1]).toBe(99_000)
  })

  it('ignores advance, budget limit, VAT and penalty amounts', () => {
    expect(values(amountField, 'Авансовый платеж составляет 252 000 рублей и входит в общую стоимость по пункту 2.1.')).toEqual([])
    expect(values(amountField, 'Лимит закупки по внутреннему бюджету покупателя — 600 000 рублей. Этот лимит не является согласованной стоимостью договора.')).toEqual([])
    expect(values(amountField, 'Неустойка составляет 0,1% стоимости поставки, но не более 50 000 рублей.')).toEqual([])
    expect(values(amountField, 'Общая стоимость составляет 120 000 рублей, в том числе НДС 20 000 рублей.')[0][1]).toBe(120_000)
  })

  it('«not specified» → absent with the sentence', () => {
    const text = 'Общая стоимость определяется спецификацией в приложении № 1. Приложение № 1 в предоставленный комплект документов не входит. Числовое значение стоимости в тексте договора не указано.'
    expect(values(amountField, text)).toEqual([['absent', null, 'Числовое значение стоимости в тексте договора не указано.']])
  })

  it('price in words only → unparsed', () => {
    expect(values(amountField, 'Общая стоимость составляет один миллион рублей.')[0][0]).toBe('unparsed')
  })

  it('proposal takes the amount after «на»', () => {
    const hits = amountField.matchProposal!('Предлагается изменить общую стоимость поставки с 1 000 000 на 1 450 000 рублей.')
    expect(hits.map((h) => h.value)).toEqual([1_450_000])
    expect(amountField.matchProposal!('Данный проект не изменяет действующие условия договора.')).toEqual([])
  })
})

describe('delivery date', () => {
  it('takes the delivery deadline', () => {
    expect(values(deliveryDateField, 'Поставщик обязуется поставить оборудование не позднее 15.04.2026.')).toEqual([
      ['value', '2026-04-15', 'Поставщик обязуется поставить оборудование не позднее 15.04.2026.'],
    ])
    expect(values(deliveryDateField, 'Поставка осуществляется до «5» июня 2026 г.')[0][1]).toBe('2026-06-05')
  })

  it('ignores payment and acceptance dates even when they mention delivery', () => {
    expect(values(deliveryDateField, 'Оплата оставшейся суммы производится не позднее 10.04.2026. Этот срок является сроком оплаты, а не поставки.')).toEqual([])
    expect(values(deliveryDateField, 'Дата приемки может отличаться от даты поставки и не изменяет срок по пункту 3.1.')).toEqual([])
    expect(values(deliveryDateField, 'Неустойка за просрочку поставки начисляется с 16.04.2026.')).toEqual([])
    expect(values(deliveryDateField, 'Поставщик обязуется оплатить штраф до 01.05.2026.')).toEqual([])
  })

  it('invalid or relative dates → unparsed', () => {
    expect(values(deliveryDateField, 'Поставщик обязуется поставить товар не позднее 31.02.2026.')[0][0]).toBe('unparsed')
    expect(values(deliveryDateField, 'Поставка производится в течение 10 дней с даты оплаты.')[0][0]).toBe('unparsed')
  })

  it('proposal «с … на …» takes the new date', () => {
    const text = 'Коллеги, предлагаем перенести срок поставки с 20.03.2026 на 27.03.2026 из-за задержки.'
    expect(deliveryDateField.matchProposal!(text).map((h) => h.value)).toEqual(['2026-03-27'])
    expect(deliveryDateField.matchProposal!('По состоянию на 10.03.2026 согласие покупателя не получено.')).toEqual([])
  })
})

describe('supplier', () => {
  it('labelled and preamble forms, not the buyer', () => {
    expect(values(supplierField, 'Покупатель: ООО «Альфа». Поставщик: ООО «Бета Плюс».')).toEqual([['value', 'ООО «Бета Плюс»', 'Поставщик: ООО «Бета Плюс».']])
    expect(values(supplierField, 'АО «Гамма», именуемое в дальнейшем «Поставщик», и …')[0][1]).toBe('АО «Гамма»')
    expect(values(supplierField, 'Поставщик обязуется поставить товар.')).toEqual([])
  })
})
