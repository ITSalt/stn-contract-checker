// Public types of the contract analysis engine (contract v1, used by the UI).

/** Uploaded TXT file. The name is shown in evidence only: it never drives classification or priority. */
export interface InputFile {
  name: string
  text: string
}

export type DocType = 'contract' | 'amendment' | 'draft' | 'letter' | 'unknown'

/** signed_both: signed by both parties; unsigned: draft, letter or explicitly not signed. */
export type SignStatus = 'signed_both' | 'unsigned' | 'unclear'

export type FieldStatus = 'ok' | 'no_data' | 'needs_review'

/** Field values: text (number, supplier), money in rubles (number), date as ISO `YYYY-MM-DD`. */
export type FieldPrimitive = string | number

export type FieldKind = 'text' | 'money' | 'date'

/** Built-in field keys. The registry (`fields/index.ts`) may add more: keys are plain strings. */
export type FieldKey = string

export interface Paragraph {
  /** `p1…pn` in file order. */
  id: string
  /** Clause number at the start of the paragraph (`2.1`), if any. */
  clause: string | null
  /** Paragraph text without surrounding whitespace: `source.slice(start, end) === text`. */
  text: string
  start: number
  end: number
  /** Text after the clause number: `source.slice(bodyStart, end) === body`. */
  body: string
  bodyStart: number
}

/** Verifiable source: `files[fileName].text.slice(start, end) === quote`. */
export interface Evidence {
  fileName: string
  paragraphId: string
  quote: string
  start: number
  end: number
}

export interface ChangeSource {
  fileName: string
  paragraphId: string
  quote: string
}

export interface FieldValue {
  value: FieldPrimitive | null
  status: FieldStatus
  /** Human readable explanation for `no_data` and `needs_review`. */
  reason?: string
  evidence: Evidence[]
  /** Contract clause the value comes from (`3.1`). */
  clause?: string | null
  /** Set when an effective amendment changed the value. */
  changedBy?: ChangeSource
  /** Value from the contract itself, before amendments (set together with `changedBy`). */
  original?: FieldPrimitive | null
  originalEvidence?: Evidence[]
}

export type PendingReason =
  | 'not_signed'
  | 'not_effective'
  | 'no_effective_date'
  | 'unclear_signature'
  | 'supplier_proposal'
  | 'letter'
  | 'unknown_document'

/** A change that does not apply on the check date: shown separately for review. */
export interface PendingChange {
  field: FieldKey
  fieldLabel: string
  /** null when the proposal was found but its value could not be parsed. */
  proposedValue: FieldPrimitive | null
  currentValue: FieldPrimitive | null
  fileName: string
  docType: DocType
  paragraphId: string
  quote: string
  evidence: Evidence
  reason: PendingReason
  reasonText: string
  effectiveDate: string | null
}

export type IssueCode =
  | 'amendment_conflict'
  | 'unlinked_document'
  | 'missing_contract'
  | 'ambiguous_link'
  | 'duplicate_contract'
  | 'unclear_signature'
  | 'contract_not_signed'
  | 'no_effective_date'
  | 'unparsed_value'
  | 'unknown_document'
  | 'missing_number'
  /** A letter refers to a signed amendment that is not among the uploaded documents. */
  | 'unconfirmed_amendment'
  /** The contract was signed after the check date. */
  | 'not_concluded'

export interface Issue {
  code: IssueCode
  message: string
  fileNames: string[]
  field?: FieldKey
}

export interface DocumentInfo {
  fileName: string
  text: string
  docType: DocType
  /** First paragraph (document title). */
  title: string
  /** Own number for a contract, referenced contract number for other documents. */
  contractNumber: string | null
  contractNumberEvidence?: Evidence
  /** All distinct contract numbers a non-contract document mentions. */
  mentionedContracts: string[]
  signStatus: SignStatus
  signStatusEvidence?: Evidence
  signDate: string | null
  effectiveDate: string | null
  effectiveDateEvidence?: Evidence
  /** Several different effective dates were found: the date is unclear. */
  effectiveDateAmbiguous: boolean
  docDate: string | null
  paragraphs: Paragraph[]
  /** Key of the contract the document is linked to (`ContractResult.key`). */
  linkedContract: string | null
}

export type RelatedRole = 'contract' | 'applied' | 'pending' | 'info'

export interface RelatedDocument {
  fileName: string
  docType: DocType
  role: RelatedRole
}

export interface ContractResult {
  /** Normalized contract number, or `file:<name>` when the number was not found. */
  key: string
  number: string | null
  fileName: string
  fields: Record<FieldKey, FieldValue>
  pendingChanges: PendingChange[]
  relatedDocuments: RelatedDocument[]
  /** Linked documents that change nothing recognizable: shown with a quote so they are not lost. */
  infoDocuments: InfoDocument[]
  issues: Issue[]
  needsReview: boolean
}

export interface InfoDocument {
  fileName: string
  docType: DocType
  reasonText: string
  /** First meaningful paragraph of the document (header lines skipped). */
  evidence: Evidence
}

export interface AnalysisResult {
  /** ISO date the conditions are computed for. */
  checkDate: string
  contracts: ContractResult[]
  documents: DocumentInfo[]
  /** Problems not tied to one contract (documents without a contract, unknown documents). */
  issues: Issue[]
}
