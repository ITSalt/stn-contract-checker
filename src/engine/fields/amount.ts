import { ABSENT_RE, findMoney, firstIndex, sentences } from '../text'
import type { FieldExtractor, MatchHit } from './types'

// The sentence must speak about the price of the contract itself…
const ABOUT = /(?:общ\S*|итогов\S*|полн\S*)\s+(?:стоимост|цен)|(?:цен\S*|стоимост\S*|сумм\S*)\s+(?:по\s+)?(?:настоящего\s+|настоящему\s+)?(?:договор|поставки|товара|оборудования)/i
// …and not about neighbouring amounts: advance, budget limit, penalty, payments and shares
// («252 000 аванс», «лимит 600 000», «первый платёж — 30% цены»). Whichever topic comes first wins.
const OTHER_AMOUNT = /аванс|предоплат|лимит|бюджет|неустойк|штраф|(?:^|[^а-яё])пен[ияюе](?![а-яё])|не\s+является|плат[её]ж|оплат|оплач|(?:^|[^а-яё])част[ьиюя]|частями|%|(?:^|[^а-яё])дол[яиюе](?![а-яё])/i
// A ceiling is not an agreed price: «не более 600 000», «не может превышать», «максимальная».
const CEILING = /не\s+более|не\s+выше|превыша|максимальн|предельн/i
const PRICE_WORD = /стоимост|(?:^|[^а-яё])цен[аыуе](?![а-яё])/i
const VAT_BEFORE = /(?:НДС|налог\S*)[^\d]{0,15}$/i
// «включая НДС 20%» is a property of the price, not another amount.
const VAT_RATE = /(НДС|налог\S*)\s*\(?\s*\d+(?:[,.]\d+)?\s*%\s*\)?/gi
const CHANGE_VERB = /(?:^|[^а-яё])(?:изменить|увеличить|уменьшить|установить)/i

function hitsIn(text: string, proposal: boolean): MatchHit[] {
  const hits: MatchHit[] = []
  for (const s of sentences(text)) {
    const sentence = text.slice(s.start, s.end)
    const topics = sentence.replace(VAT_RATE, '$1')
    const aboutAt = firstIndex(topics, ABOUT)
    const otherAt = firstIndex(topics, OTHER_AMOUNT)
    // Another amount is the subject of the sentence (advance, limit, penalty, payment): skip.
    if (otherAt < aboutAt) continue
    let money = findMoney(sentence).filter((m) => !VAT_BEFORE.test(sentence.slice(0, m.start)))
    const about = aboutAt < Infinity || (proposal && PRICE_WORD.test(topics))
    if (!about) {
      if (proposal || !PRICE_WORD.test(topics)) continue
      if (ABSENT_RE.test(sentence)) {
        // «Числовое значение стоимости в тексте договора не указано.»
        hits.push({ kind: 'absent', start: s.start, end: s.end, reason: 'В договоре сказано, что стоимость не указана' })
      } else if (money.length > 0) {
        hits.push({ kind: 'unparsed', start: s.start, end: s.end, reason: 'Сумма упомянута рядом со словом «стоимость», но пункт не распознан как итоговая стоимость' })
      }
      continue
    }
    if (money.length > 0 && CEILING.test(topics)) {
      hits.push({ kind: 'unparsed', start: s.start, end: s.end, reason: 'Указан предел стоимости, а не согласованная стоимость' })
      continue
    }
    if (money.length > 0 && otherAt < Infinity) {
      hits.push({ kind: 'unparsed', start: s.start, end: s.end, reason: 'В пункте о стоимости упомянуты другие платежи или суммы (аванс, оплата, доля)' })
      continue
    }
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

/** Total contract price in rubles. Advance, limit, ceiling, payment share, VAT and penalty amounts are not taken. */
export const amountField: FieldExtractor = {
  key: 'amount',
  label: 'Сумма, ₽',
  kind: 'money',
  match: (text) => hitsIn(text, false),
  matchProposal: (text) => (CHANGE_VERB.test(text) ? hitsIn(text, true) : []),
}
