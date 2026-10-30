// Shared aggregation of matcher hits into a FieldValue. Used for contracts and amended clauses.

import type { Evidence, FieldPrimitive, FieldValue, Paragraph } from '../types'
import type { FieldExtractor, MatchHit } from './types'

export interface LocatedHit extends MatchHit {
  evidence: Evidence
  paragraph: Paragraph
}

/** Runs `match` on `text` that starts at `offset` in the file, and turns hits into evidence. */
export function locate(
  hits: MatchHit[],
  fileName: string,
  source: string,
  paragraph: Paragraph,
  offset: number,
): LocatedHit[] {
  return hits.map((h) => {
    const start = offset + h.start
    const end = offset + h.end
    return { ...h, paragraph, evidence: { fileName, paragraphId: paragraph.id, quote: source.slice(start, end), start, end } }
  })
}

/**
 * Hits → value. One distinct value → ok. Several values, values mixed with «not recognized» or
 * with «absent» → needs_review (never pick one silently). Only «absent» → no_data with quote.
 */
export function aggregate(hits: LocatedHit[], label: string): FieldValue {
  const values = hits.filter((h) => h.kind === 'value')
  const unparsed = hits.filter((h) => h.kind === 'unparsed')
  const absent = hits.filter((h) => h.kind === 'absent')
  const distinct = [...new Set(values.map((h) => h.value))]
  const clause = (hits[0]?.paragraph.clause ?? null) as string | null

  if (values.length > 0 && distinct.length === 1 && unparsed.length === 0 && absent.length === 0) {
    return { value: distinct[0] as FieldPrimitive, status: 'ok', evidence: values.map((h) => h.evidence), clause: values[0].paragraph.clause }
  }
  if (distinct.length > 1) {
    return {
      value: null,
      status: 'needs_review',
      reason: `Найдено несколько разных значений поля «${label}»`,
      evidence: values.map((h) => h.evidence),
      clause,
    }
  }
  if (unparsed.length > 0) {
    return {
      value: null,
      status: 'needs_review',
      reason: unparsed[0].reason ?? `Поле «${label}» найдено, но значение не распознано`,
      evidence: [...values, ...unparsed].map((h) => h.evidence),
      clause,
    }
  }
  if (values.length > 0) {
    return {
      value: null,
      status: 'needs_review',
      reason: `Значение поля «${label}» найдено, но в тексте также сказано, что оно не указано`,
      evidence: [...values, ...absent].map((h) => h.evidence),
      clause,
    }
  }
  if (absent.length > 0) {
    return {
      value: null,
      status: 'no_data',
      reason: absent[0].reason ?? 'В тексте договора сказано, что значение не указано',
      evidence: absent.map((h) => h.evidence),
      clause,
    }
  }
  return { value: null, status: 'no_data', reason: `Пункт о поле «${label}» в тексте не найден`, evidence: [], clause: null }
}

/** Default extraction: run the matcher on every paragraph body of the contract. */
export function extractByParagraphs(fileName: string, text: string, paragraphs: Paragraph[], extractor: FieldExtractor): FieldValue {
  const hits: LocatedHit[] = []
  for (const p of paragraphs) {
    hits.push(...locate(extractor.match(p.body), fileName, text, p, p.bodyStart))
  }
  return aggregate(hits, extractor.label)
}
