import { ABSENT_RE, findDates, sentences, topicFirst } from '../text'
import type { FieldExtractor, MatchHit } from './types'

// «поставить», «поставка», «поставки» — but not «Поставщик».
const DELIVERY = /(?:^|[^а-яё])постав(?!щик)/i
// A sentence whose first topic is payment or acceptance is not about the delivery term
// («Оплата … не позднее 10.04.2026», «Дата приемки может отличаться от даты поставки»).
const OTHER_TOPIC = /оплат|при[её]мк|аванс|неустойк|штраф|пен[ияюе]|гаранти/i
const DEADLINE_BEFORE = /(?:не\s+позднее|не\s+позже|до|по)\s*«?$/i
const CHANGE_VERB = /(?:^|[^а-яё])(?:изменить|перенести|продлить|сдвинуть|установить)/i

function hitsIn(text: string, proposal: boolean): MatchHit[] {
  const hits: MatchHit[] = []
  for (const s of sentences(text)) {
    const sentence = text.slice(s.start, s.end)
    if (!DELIVERY.test(sentence) || !topicFirst(sentence, DELIVERY, OTHER_TOPIC)) continue
    const dates = findDates(sentence)
    if (dates.length === 0) {
      if (proposal) continue
      if (/срок/i.test(sentence) && ABSENT_RE.test(sentence)) {
        hits.push({ kind: 'absent', start: s.start, end: s.end, reason: 'В договоре сказано, что срок поставки не указан' })
      } else if (/не\s+позднее|в\s+течение|срок/i.test(sentence) && /\d/.test(sentence)) {
        hits.push({ kind: 'unparsed', start: s.start, end: s.end, reason: 'Срок поставки указан не календарной датой' })
      }
      continue
    }
    if (dates.some((d) => d.value === null)) {
      hits.push({ kind: 'unparsed', start: s.start, end: s.end, reason: 'Дата поставки не является корректной датой' })
      continue
    }
    let candidates = dates
    if (new Set(candidates.map((d) => d.value)).size > 1) {
      // «с 20.03.2026 на 27.03.2026» (proposal) or «не позднее 15.04.2026» among other dates.
      const marker = proposal ? /(?:^|[^а-яё])на\s*$/i : DEADLINE_BEFORE
      candidates = dates.filter((d) => marker.test(sentence.slice(Math.max(0, d.start - 12), d.start)))
    }
    const distinct = [...new Set(candidates.map((d) => d.value))]
    if (distinct.length === 1) {
      hits.push({ kind: 'value', value: distinct[0] as string, start: s.start, end: s.end })
    } else {
      hits.push({ kind: 'unparsed', start: s.start, end: s.end, reason: 'В пункте о сроке поставки несколько разных дат' })
    }
  }
  return hits
}

/** Delivery deadline (ISO date). Payment and acceptance dates are ignored by sentence topic. */
export const deliveryDateField: FieldExtractor = {
  key: 'deliveryDate',
  label: 'Срок поставки',
  kind: 'date',
  match: (text) => hitsIn(text, false),
  matchProposal: (text) => (CHANGE_VERB.test(text) ? hitsIn(text, true) : []),
}
