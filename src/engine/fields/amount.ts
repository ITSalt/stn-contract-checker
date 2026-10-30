import { ABSENT_RE, findMoney, sentences } from '../text'
import type { FieldExtractor, MatchHit } from './types'

// The sentence must speak about the price of the contract itself…
const ABOUT = /(?:общ\S*|итогов\S*|полн\S*)\s+(?:стоимост|цен)|(?:цен\S*|стоимост\S*|сумм\S*)\s+(?:настоящего\s+)?(?:договора|поставки|товара|оборудования)/i
// …and not about neighbouring amounts: advance, budget limit, penalty («252 000 аванс», «лимит 600 000»).
const OTHER_AMOUNT = /аванс|лимит|бюджет|неустойк|штраф|пен[ияюе]|не\s+является|предоплат/i
const VAT_BEFORE = /(?:НДС|налог\S*)[^\d]{0,15}$/i
const CHANGE_VERB = /(?:^|[^а-яё])(?:изменить|увеличить|уменьшить|установить)/i

function hitsIn(text: string, proposal: boolean): MatchHit[] {
  const hits: MatchHit[] = []
  for (const s of sentences(text)) {
    const sentence = text.slice(s.start, s.end)
    if (OTHER_AMOUNT.test(sentence)) continue
    const about = ABOUT.test(sentence) || (proposal && /стоимост|(?:^|[^а-яё])цен[аыуе]/i.test(sentence))
    if (!about) {
      // «Числовое значение стоимости в тексте договора не указано.»
      if (!proposal && /стоимост|(?:^|[^а-яё])цен[аыуе]|сумм[аыуе]\s+договора/i.test(sentence) && ABSENT_RE.test(sentence)) {
        hits.push({ kind: 'absent', start: s.start, end: s.end, reason: 'В договоре сказано, что стоимость не указана' })
      }
      continue
    }
    let money = findMoney(sentence).filter((m) => !VAT_BEFORE.test(sentence.slice(0, m.start)))
    if (proposal) {
      // «с 1 000 000 на 1 450 000 рублей»: the proposed amount follows «на».
      const after = money.filter((m) => /(?:^|[^а-яё])на\s*$/i.test(sentence.slice(Math.max(0, m.start - 6), m.start)))
      if (after.length > 0) money = after
    }
    const distinct = [...new Set(money.map((m) => m.value))]
    if (distinct.length === 1) {
      hits.push({ kind: 'value', value: distinct[0], start: s.start, end: s.end })
    } else if (distinct.length > 1) {
      hits.push({ kind: 'unparsed', start: s.start, end: s.end, reason: 'В пункте о стоимости несколько разных сумм' })
    } else if (ABSENT_RE.test(sentence)) {
      hits.push({ kind: 'absent', start: s.start, end: s.end, reason: 'В договоре сказано, что стоимость не указана' })
    } else if (/руб|₽/i.test(sentence) || (/\d/.test(sentence) && /составля|в\s+размере/i.test(sentence))) {
      hits.push({ kind: 'unparsed', start: s.start, end: s.end, reason: 'Стоимость упомянута, но сумма в рублях не распознана' })
    }
  }
  return hits
}

/** Total contract price in rubles. Advance, budget limit, VAT and penalty amounts are ignored. */
export const amountField: FieldExtractor = {
  key: 'amount',
  label: 'Сумма, ₽',
  kind: 'money',
  match: (text) => hitsIn(text, false),
  matchProposal: (text) => (CHANGE_VERB.test(text) ? hitsIn(text, true) : []),
}
