// Field registry. Order here is the column order in the UI.
//
// How to add a field (e.g. the penalty rate «ставка неустойки»):
//   1. Create `fields/<name>.ts` exporting a `FieldExtractor`: `key`, `label`, `kind` and
//      `match(text)` that finds the field in one paragraph body by meaning and returns hits with
//      the quote span (usually the sentence): `value`, `absent` («ставка не установлена») or
//      `unparsed`. Add `matchProposal` if letters/drafts may propose a new value.
//   2. Register it in `FIELDS` below.
//   3. Add a test next to it (`fields/<name>.test.ts`) with a real clause and an «absent» clause.
// Nothing else changes: analyze() extracts every registered field, amendments («Пункт N
// договора изложить в следующей редакции») are mapped to the field by clause number or by
// `match`, and evidence/no_data/needs_review handling is shared (`common.ts`).

import { amountField } from './amount'
import { deliveryDateField } from './deliveryDate'
import { numberField } from './number'
import { supplierField } from './supplier'
import type { FieldExtractor } from './types'

export const FIELDS: FieldExtractor[] = [numberField, supplierField, amountField, deliveryDateField]

export const FIELD_KEYS = {
  number: numberField.key,
  supplier: supplierField.key,
  amount: amountField.key,
  deliveryDate: deliveryDateField.key,
} as const

export function fieldByKey(key: string): FieldExtractor | undefined {
  return FIELDS.find((f) => f.key === key)
}

export type { FieldExtractor, MatchHit } from './types'
