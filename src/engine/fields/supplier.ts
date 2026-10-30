import { sentences } from '../text'
import type { FieldExtractor, MatchHit } from './types'

// «Поставщик: ООО «Вектор Прибор».» or «ООО «X», именуемое в дальнейшем «Поставщик»».
const LABELLED = /(?:^|[^а-яё])Поставщик\s*[:—–-]\s*(.+?)\s*[.;]?$/i
const PREAMBLE = /((?:[А-ЯЁA-Z]{2,4}\s+)?«[^»]+»)\s*,?\s*именуем\S*\s+в\s+дальнейшем\s+«?Поставщик/i

export const supplierField: FieldExtractor = {
  key: 'supplier',
  label: 'Поставщик',
  kind: 'text',
  match(text) {
    const hits: MatchHit[] = []
    for (const s of sentences(text)) {
      const sentence = text.slice(s.start, s.end)
      const m = LABELLED.exec(sentence) ?? PREAMBLE.exec(sentence)
      if (!m) continue
      const name = m[1].trim()
      if (name.length === 0) {
        hits.push({ kind: 'unparsed', start: s.start, end: s.end, reason: 'Поставщик упомянут, но название не распознано' })
      } else {
        hits.push({ kind: 'value', value: name, start: s.start, end: s.end })
      }
    }
    return hits
  },
}
