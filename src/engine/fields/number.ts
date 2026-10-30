import type { FieldExtractor } from './types'

/** Contract number: taken from the title by the classifier (`№ …`), never from other paragraphs. */
export const numberField: FieldExtractor = {
  key: 'number',
  label: 'Номер договора',
  kind: 'text',
  amendable: false,
  match: () => [],
  extract(doc) {
    if (doc.contractNumber && doc.contractNumberEvidence) {
      return { value: doc.contractNumber, status: 'ok', evidence: [doc.contractNumberEvidence], clause: null }
    }
    return { value: null, status: 'needs_review', reason: 'Номер договора в заголовке не найден', evidence: [], clause: null }
  },
}
