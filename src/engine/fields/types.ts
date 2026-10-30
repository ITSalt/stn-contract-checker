import type { DocumentInfo, FieldKind, FieldPrimitive, FieldValue } from '../types'

/** One hit of a field matcher inside the text it was given (offsets relative to that text). */
export interface MatchHit {
  /** value: parsed; absent: the text says there is no value; unparsed: field found, value not recognized. */
  kind: 'value' | 'absent' | 'unparsed'
  value?: FieldPrimitive
  reason?: string
  /** Quote span (usually the sentence) relative to the matched text. */
  start: number
  end: number
}

export interface FieldExtractor {
  key: string
  /** Russian label for the UI and messages. */
  label: string
  kind: FieldKind
  /**
   * Finds the field in one paragraph body of a contract, or in the new wording of a clause
   * from an amendment («Пункт 2.1 договора изложить в следующей редакции: «…»»).
   * Returns [] when the text is not about this field. Must decide by meaning, not by position.
   */
  match(text: string): MatchHit[]
  /** Free-form proposal in a letter or draft: «предлагаем перенести срок поставки на 27.03.2026». */
  matchProposal?(text: string): MatchHit[]
  /** Whole-document extraction instead of the paragraph-by-paragraph default (contract number). */
  extract?(doc: DocumentInfo): FieldValue
  /** false: amendments and proposals never change this field. Default true. */
  amendable?: boolean
}
