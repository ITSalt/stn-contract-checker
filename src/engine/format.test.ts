import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, formatValue } from './format'
import { findMoney } from './text'

describe('format and money parsing', () => {
  it('formats values for the UI', () => {
    expect(formatMoney(1_450_000)).toBe('1 450 000 ₽')
    expect(formatMoney(99.5)).toBe('99,50 ₽')
    expect(formatDate('2026-03-27')).toBe('27.03.2026')
    expect(formatValue('money', null)).toBe('нет данных')
  })

  it('parses amounts with non-breaking spaces and kopeks, not dates or percents', () => {
    expect(findMoney('составляет 1 450 000 руб.').map((m) => m.value)).toEqual([1_450_000])
    expect(findMoney('составляет 12 500,75 ₽').map((m) => m.value)).toEqual([12_500.75])
    expect(findMoney('не позднее 15.04.2026, неустойка 0,1% за день')).toEqual([])
  })
})
