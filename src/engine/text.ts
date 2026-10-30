// Low-level text helpers: sentences, dates, money. No knowledge of specific documents.

export interface Span {
  start: number
  end: number
}

export interface Found<T> extends Span {
  value: T
}

/** Trimmed span of `text.slice(start, end)`. */
export function trimSpan(text: string, start: number, end: number): Span {
  while (start < end && /\s/.test(text[start])) start++
  while (end > start && /\s/.test(text[end - 1])) end--
  return { start, end }
}

/**
 * Sentence spans inside `text`. A boundary is a sentence-ending mark followed by whitespace and
 * an upper-case letter or opening quote, so dots in dates (15.04.2026) and amounts do not split.
 */
export function sentences(text: string): Span[] {
  const result: Span[] = []
  const boundary = /[.!?…]+["»”)]?(?=\s+["«“(]?[А-ЯЁA-Z])/g
  let from = 0
  for (const m of text.matchAll(boundary)) {
    const end = m.index + m[0].length
    const span = trimSpan(text, from, end)
    if (span.end > span.start) result.push(span)
    from = end
  }
  const last = trimSpan(text, from, text.length)
  if (last.end > last.start) result.push(last)
  return result
}

const MONTHS: Record<string, number> = {
  января: 1,
  февраля: 2,
  марта: 3,
  апреля: 4,
  мая: 5,
  июня: 6,
  июля: 7,
  августа: 8,
  сентября: 9,
  октября: 10,
  ноября: 11,
  декабря: 12,
}

export function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1) return null
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day > daysInMonth) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Local calendar date of `date` as ISO `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) ?? ''
}

export interface DateMatch extends Span {
  /** ISO date, or null when the text looks like a date but is not a valid calendar date. */
  value: string | null
}

/** Dates in `DD.MM.YYYY` and `«DD» месяца YYYY` forms. */
export function findDates(text: string): DateMatch[] {
  const result: DateMatch[] = []
  for (const m of text.matchAll(/(?<![\d.])(\d{1,2})\.(\d{1,2})\.(\d{4})(?!\d)/g)) {
    result.push({ start: m.index, end: m.index + m[0].length, value: isoDate(+m[3], +m[2], +m[1]) })
  }
  const named = /(?<!\d)«?(\d{1,2})»?\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})(?!\d)/gi
  for (const m of text.matchAll(named)) {
    result.push({
      start: m.index,
      end: m.index + m[0].length,
      value: isoDate(+m[3], MONTHS[m[2].toLowerCase()], +m[1]),
    })
  }
  return result.sort((a, b) => a.start - b.start)
}

/** Amounts followed by a ruble mark: `1 500 000 (один миллион пятьсот тысяч) рублей`, `600 000 руб.`, `5000 ₽`. */
export function findMoney(text: string): Found<number>[] {
  const result: Found<number>[] = []
  const re = /(?<![\d.,])(\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[,.](\d{1,2}))?(?![\d.,]\d)\s*(?:\([^()]*\)\s*)?(?:руб|₽|р\.)/gi
  for (const m of text.matchAll(re)) {
    const rubles = Number(m[1].replace(/[ \u00A0\u202F]/g, ''))
    const kopeks = m[2] ? Number(m[2].padEnd(2, '0')) / 100 : 0
    result.push({ start: m.index, end: m.index + m[1].length + (m[2] ? m[2].length + 1 : 0), value: rubles + kopeks })
  }
  return result
}

/** Explicit statement that a value is absent: «не указано», «не установлена», «не определён». */
export const ABSENT_RE = /(?:^|[^а-яё])не\s+(?:указан|установлен|определ[её]н|согласован|предусмотрен)/i

/** Normalized key for comparing contract numbers: upper case, Cyrillic look-alikes as Latin, one dash. */
export function normalizeNumber(number: string): string {
  const lookAlike: Record<string, string> = {
    А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', У: 'Y',
  }
  return number
    .toUpperCase()
    .replace(/[АВЕКМНОРСТХУ]/g, (ch) => lookAlike[ch] ?? ch)
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\s+/g, '')
}

/** Index of the first match of `re` in `text`, or Infinity. */
export function firstIndex(text: string, re: RegExp): number {
  const m = re.exec(text)
  return m ? m.index : Infinity
}

/** True when the first keyword of `topic` comes before any keyword of `others` (delivery before payment). */
export function topicFirst(sentence: string, topic: RegExp, others: RegExp): boolean {
  return firstIndex(sentence, topic) < firstIndex(sentence, others)
}
