import { ABSENT_RE, findDates, sentences, topicFirst } from '../text'
import type { FieldExtractor, MatchHit } from './types'

// The delivery itself: «поставить», «поставка», «поставлен», «срок отгрузки» — but not
// «Поставщик» or the participle «поставленный (товар оплачивается…)».
const DELIVERY = /(?:^|[^а-яё])(?:постав(?:ить|ит|ят|ляет|ляется|ляются|лен|лена|лено|лены|ка|ки|ке|ку|кой)|отгруз(?:ить|ит|ят|ка|ки|ке|ку|кой))(?![а-яё])/i
// A sentence whose first topic is payment or acceptance is not about the delivery term
// («Оплата … не позднее 10.04.2026», «Дата приемки может отличаться от даты поставки»,
// «Поставленный товар оплачивается не позднее…»), verb forms included.
const OTHER_TOPIC = /оплат|оплач|при[её]мк|принима|принят|аванс|неустойк|штраф|(?:^|[^а-яё])пен[ияюе](?![а-яё])|гаранти/i
// When the predicate is a payment or acceptance verb («поставка оплачивается…», «товар
// принимается…»), the date belongs to it, unless a delivery verb comes first.
const DELIVERY_VERB = /(?:^|[^а-яё])(?:постав(?:ить|ит|ят|ляет|ляется|ляются|лен|лена|лено|лены)|отгруз(?:ить|ит|ят))(?![а-яё])/i
const PAYMENT_VERB = /оплач|оплатить|принима|принять|принят/i
const DEADLINE_BEFORE = /(?:не\s+позднее|не\s+позже|до|по)\s*«?$/i
// «пункт 3.1 договора изложен в новой редакции», «согласны на перенос срока» (letters) count too.
const CHANGE_VERB = /(?:^|[^а-яё])(?:изменить|перенести|перенос|продлить|сдвинуть|установить|изложен|изложить|редакци)/i

function hitsIn(text: string, proposal: boolean): MatchHit[] {
  const hits: MatchHit[] = []
  for (const s of sentences(text)) {
    const sentence = text.slice(s.start, s.end)
    if (!DELIVERY.test(sentence) || !topicFirst(sentence, DELIVERY, OTHER_TOPIC)) continue
    if (PAYMENT_VERB.test(sentence) && !topicFirst(sentence, DELIVERY_VERB, PAYMENT_VERB)) continue
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
