import type { FieldKind, FieldPrimitive } from './types'

export const NO_DATA = 'нет данных'

/** `2026-04-30` → `30.04.2026`. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** `1500000` → `1 500 000 ₽` (non-breaking spaces). */
export function formatMoney(value: number): string {
  const [int, frac] = value.toFixed(2).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
  return `${grouped}${frac === '00' ? '' : `,${frac}`}\u00A0₽`
}

export function formatValue(kind: FieldKind, value: FieldPrimitive | null): string {
  if (value === null) return NO_DATA
  if (kind === 'money' && typeof value === 'number') return formatMoney(value)
  if (kind === 'date' && typeof value === 'string') return formatDate(value)
  return String(value)
}
