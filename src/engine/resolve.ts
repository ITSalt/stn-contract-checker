// Links documents to contracts by number and applies amendments as of the check date (D-7, A-2).
//
// Rule: a condition changes only by an amendment signed by both parties whose effective date is
// on or before the check date. Signed-but-not-yet-effective amendments, drafts and letters go to
// `pendingChanges`. File names and upload order never decide priority.

import { aggregate, extractByParagraphs, locate } from './fields/common'
import { FIELDS } from './fields'
import type { FieldExtractor } from './fields/types'
import { formatValue } from './format'
import { normalizeNumber } from './text'
import type {
  ChangeSource,
  ContractResult,
  DocumentInfo,
  Evidence,
  FieldPrimitive,
  FieldValue,
  Issue,
  IssueCode,
  PendingChange,
  PendingReason,
  RelatedDocument,
} from './types'

/** A change of one field found in a non-contract document. */
export interface FoundChange {
  field: FieldExtractor
  /** null: the change was found but its value was not recognized (see `reason`). */
  value: FieldPrimitive | null
  reason?: string
  evidence: Evidence
  source: ChangeSource
}

// «Пункт 2.1 договора [в редакции дополнительного соглашения № 1] изложить в следующей редакции: «…»».
const REPLACE_RE = /(?:пункт|п\.)\s*(\d{1,3}(?:\.\d{1,3})*)\s+(?:настоящего\s+)?договора\s+(?:в\s+редакции\s+[^«"“:]{1,80}?\s+)?(?:изложить|читать)\s+в\s+(?:следующей|новой)\s+редакции\s*:?\s*[«"“]/i

// Safety net for amendments: a paragraph that changes a price or term clause in a wording not
// recognized above must not leave the contract value silently «ок».
const AMEND_VERB = /(?:^|[^а-яё])(?:изложить|изменить|увеличить|уменьшить|установить|заменить|дополнить|исключить|читать)/i
const NO_CHANGE = /без\s+изменени/i

// The clause a paragraph is about is its first reference: in «Пункт 3.2 … изложить: «… не изменяет
// срок поставки по пункту 3.1»» clause 3.1 is only mentioned.
const CLAUSE_REF = /(?:пункт\S*|п\.)\s*(\d{1,3}(?:\.\d{1,3})*)/i

/** Changes in an amendment, draft or letter: clause replacements and free-form proposals. */
export function extractChanges(doc: DocumentInfo, contractFields: Record<string, FieldValue>, fields: FieldExtractor[] = FIELDS): FoundChange[] {
  const changes: FoundChange[] = []
  const amendable = fields.filter((f) => f.amendable !== false)
  for (const p of doc.paragraphs) {
    const before = changes.length
    const source: ChangeSource = { fileName: doc.fileName, paragraphId: p.id, quote: p.text }
    const paragraphEvidence: Evidence = { fileName: doc.fileName, paragraphId: p.id, quote: p.text, start: p.start, end: p.end }
    const m = REPLACE_RE.exec(p.body)
    if (m) {
      const clause = m[1]
      const innerStart = m.index + m[0].length
      const close = Math.max(p.body.lastIndexOf('»'), p.body.lastIndexOf('”'), p.body.lastIndexOf('"'))
      const innerEnd = close > innerStart ? close : p.body.length
      const inner = p.body.slice(innerStart, innerEnd)
      for (const field of amendable) {
        const mapped = contractFields[field.key]?.clause === clause
        const hits = locate(field.match(inner), doc.fileName, doc.text, p, p.bodyStart + innerStart)
        const relevant = hits.some((h) => h.kind !== 'absent')
        if (!mapped && !relevant) continue
        if (hits.length === 0) {
          changes.push({
            field,
            value: null,
            reason: `Новая редакция пункта ${clause} не содержит распознаваемого значения поля «${field.label}»`,
            evidence: paragraphEvidence,
            source,
          })
          continue
        }
        const agg = aggregate(hits, field.label)
        changes.push({
          field,
          value: agg.status === 'ok' ? agg.value : null,
          reason: agg.status === 'ok' ? undefined : agg.reason,
          evidence: agg.evidence[0] ?? paragraphEvidence,
          source,
        })
      }
    } else {
      for (const field of amendable) {
        if (!field.matchProposal) continue
        const hits = locate(field.matchProposal(p.body), doc.fileName, doc.text, p, p.bodyStart)
        if (hits.length === 0) continue
        const agg = aggregate(hits, field.label)
        changes.push({
          field,
          value: agg.status === 'ok' ? agg.value : null,
          reason: agg.status === 'ok' ? undefined : agg.reason,
          evidence: agg.evidence[0] ?? paragraphEvidence,
          source,
        })
      }
    }
    if (doc.docType !== 'amendment' || !AMEND_VERB.test(p.body) || NO_CHANGE.test(p.body)) continue
    const subject = CLAUSE_REF.exec(p.body)?.[1]
    const found = new Set(changes.slice(before).map((c) => c.field.key))
    for (const field of amendable) {
      if (!field.matchProposal || found.has(field.key)) continue
      const clause = contractFields[field.key]?.clause
      if (subject ? subject !== clause : field.match(p.body).length === 0) continue
      changes.push({
        field,
        value: null,
        reason: `Допсоглашение меняет ${clause ? `пункт ${clause}` : `поле «${field.label}»`}, но новое значение не распознано`,
        evidence: paragraphEvidence,
        source,
      })
    }
  }
  return changes
}

type Applicability = { apply: true } | { apply: false; reason: PendingReason; text: string; issue?: IssueCode }

function formatIso(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

// Header lines of letters and amendments: not a meaningful quote for an info document.
const HEADER_LINE = /^(?:Дата|Статус|От|Кому|Тема|Покупатель|Поставщик)\s*:/i

/** First meaningful paragraph after the title; its span is exact, so `text.slice(start, end) === quote`. */
function infoEvidence(doc: DocumentInfo): Evidence {
  const p = doc.paragraphs.slice(1).find((x) => x.text.trim() !== '' && !HEADER_LINE.test(x.text)) ?? doc.paragraphs[0]
  return { fileName: doc.fileName, paragraphId: p.id, quote: p.text, start: p.start, end: p.end }
}

// «направляем дополнительное соглашение № 1 …, подписанное обеими сторонами» (but not «не подписано»).
const SIGNED_AMENDMENT_MENTION =
  /(?:дополнительн\S*\s+соглашени\S*|допсоглашени\S*)(?:\s+№\s*(\d+))?[^.]{0,120}?(?<!не\s)подписан\S*\s+(?:обеими|сторонами)/i

/**
 * A letter that refers to a signed amendment absent from the linked documents: returns its number
 * ('' when the letter gives none), or null when there is no such reference or the amendment is uploaded.
 */
function missingSignedAmendment(letter: DocumentInfo, linked: DocumentInfo[]): string | null {
  const m = SIGNED_AMENDMENT_MENTION.exec(letter.text)
  if (!m) return null
  const number = m[1] ?? ''
  const uploaded = linked.some(
    (d) => d.docType === 'amendment' && d.signStatus === 'signed_both' && (!number || new RegExp(`СОГЛАШЕНИЕ\\s*№\\s*${number}(?!\\d)`, 'i').test(d.paragraphs[0]?.text ?? '')),
  )
  return uploaded ? null : number
}

function quotedName(text: string): string | null {
  const m = /«([^»]+)»/.exec(text)
  return m ? m[1].trim().toLowerCase() : null
}

function applicability(doc: DocumentInfo, checkDate: string, supplier: FieldPrimitive | null): Applicability {
  switch (doc.docType) {
    case 'amendment':
      if (doc.signStatus === 'unsigned') return { apply: false, reason: 'not_signed', text: 'Допсоглашение не подписано обеими сторонами' }
      if (doc.signStatus === 'unclear') {
        return { apply: false, reason: 'unclear_signature', text: 'Статус подписания допсоглашения неясен', issue: 'unclear_signature' }
      }
      if (!doc.effectiveDate) {
        const text = doc.effectiveDateAmbiguous ? 'В допсоглашении несколько разных дат вступления в силу' : 'Дата вступления в силу не указана'
        return { apply: false, reason: 'no_effective_date', text, issue: 'no_effective_date' }
      }
      if (doc.effectiveDate > checkDate) {
        return {
          apply: false,
          reason: 'not_effective',
          text: `Не вступило в силу на ${formatIso(checkDate)}: вступает в силу ${formatIso(doc.effectiveDate)}`,
        }
      }
      if (doc.signDate && doc.signDate > checkDate) {
        // Retroactive effective date, but on the check date the amendment was not signed yet.
        return { apply: false, reason: 'not_effective', text: `Не действовало на ${formatIso(checkDate)}: подписано ${formatIso(doc.signDate)}` }
      }
      return { apply: true }
    case 'draft':
      return { apply: false, reason: 'not_signed', text: 'Проект, не подписан' }
    case 'letter': {
      const from = doc.paragraphs.find((p) => /^От\s*:/i.test(p.text))
      const sender = from ? quotedName(from.text) : null
      const supplierName = typeof supplier === 'string' ? quotedName(supplier) : null
      if (sender && supplierName && sender === supplierName) {
        return { apply: false, reason: 'supplier_proposal', text: 'Предложение поставщика в письме, не согласовано допсоглашением' }
      }
      return { apply: false, reason: 'letter', text: 'Сведения из письма, не согласованы допсоглашением' }
    }
    default:
      return { apply: false, reason: 'unknown_document', text: 'Тип документа не распознан', issue: 'unknown_document' }
  }
}

function extractContractFields(doc: DocumentInfo, fields: FieldExtractor[]): Record<string, FieldValue> {
  const result: Record<string, FieldValue> = {}
  for (const f of fields) {
    result[f.key] = f.extract ? f.extract(doc) : extractByParagraphs(doc.fileName, doc.text, doc.paragraphs, f)
  }
  return result
}

/** Fields of duplicate contracts: equal values are kept, different values → needs_review. */
function mergeDuplicates(all: Record<string, FieldValue>[], fields: FieldExtractor[]): Record<string, FieldValue> {
  const result: Record<string, FieldValue> = {}
  for (const f of fields) {
    const values = all.map((r) => r[f.key])
    const evidence = values.flatMap((v) => v.evidence)
    const same = values.every((v) => v.value === values[0].value && v.status === values[0].status)
    result[f.key] = same
      ? { ...values[0], evidence }
      : { value: null, status: 'needs_review', reason: `Договоры с одинаковым номером расходятся в поле «${f.label}»`, evidence, clause: values[0].clause }
  }
  return result
}

/** Sort key that does not depend on file names or upload order. */
function docOrder(a: DocumentInfo, b: DocumentInfo): number {
  return (a.effectiveDate ?? a.docDate ?? '').localeCompare(b.effectiveDate ?? b.docDate ?? '') || a.text.localeCompare(b.text)
}

export interface Resolution {
  contracts: ContractResult[]
  issues: Issue[]
}

export function resolve(documents: DocumentInfo[], checkDate: string, fields: FieldExtractor[] = FIELDS): Resolution {
  const globalIssues: Issue[] = []

  // 1. Contracts grouped by normalized number.
  const groups = new Map<string, DocumentInfo[]>()
  for (const doc of documents) {
    if (doc.docType !== 'contract') continue
    const key = doc.contractNumber ? normalizeNumber(doc.contractNumber) : `file:${doc.fileName}`
    groups.set(key, [...(groups.get(key) ?? []), doc])
  }

  const contracts: ContractResult[] = []
  const byKey = new Map<string, { result: ContractResult; base: Record<string, FieldValue>; docs: DocumentInfo[]; linked: DocumentInfo[] }>()
  for (const [key, docs] of groups) {
    docs.sort(docOrder)
    const all = docs.map((d) => extractContractFields(d, fields))
    const base = all.length === 1 ? all[0] : mergeDuplicates(all, fields)
    const issues: Issue[] = []
    const names = docs.map((d) => d.fileName)
    if (docs.length > 1) {
      issues.push({ code: 'duplicate_contract', message: `Загружено несколько договоров с номером ${docs[0].contractNumber}`, fileNames: names })
    }
    if (!docs[0].contractNumber) {
      issues.push({ code: 'missing_number', message: 'Номер договора в заголовке не найден', fileNames: names })
    }
    for (const d of docs) {
      if (d.signStatus === 'unclear') {
        issues.push({ code: 'unclear_signature', message: 'Статус подписания договора неясен', fileNames: [d.fileName] })
      } else if (d.signStatus === 'unsigned') {
        issues.push({ code: 'contract_not_signed', message: 'Договор не подписан обеими сторонами', fileNames: [d.fileName] })
      }
      d.linkedContract = key
    }
    const result: ContractResult = {
      key,
      number: docs[0].contractNumber,
      fileName: docs[0].fileName,
      fields: structuredClone(base),
      pendingChanges: [],
      relatedDocuments: docs.map((d) => ({ fileName: d.fileName, docType: d.docType, role: 'contract' as const })),
      infoDocuments: [],
      issues,
      needsReview: false,
    }
    contracts.push(result)
    byKey.set(key, { result, base, docs, linked: [] })
  }

  // 2. Link the other documents by the contract number in their text.
  for (const doc of documents) {
    if (doc.docType === 'contract') continue
    doc.linkedContract = null
    if (doc.mentionedContracts.length > 1) {
      globalIssues.push({
        code: 'ambiguous_link',
        message: `Документ упоминает несколько договоров (${doc.mentionedContracts.join(', ')}): связь не определена`,
        fileNames: [doc.fileName],
      })
      // Each uploaded contract it names needs review: its changes are not applied or shown as pending.
      for (const number of doc.mentionedContracts) {
        byKey.get(normalizeNumber(number))?.result.issues.push({
          code: 'ambiguous_link',
          message: `Документ упоминает несколько договоров (${doc.mentionedContracts.join(', ')}); его изменения не учтены — проверьте вручную`,
          fileNames: [doc.fileName],
        })
      }
      continue
    }
    if (!doc.contractNumber) {
      globalIssues.push({
        code: doc.docType === 'unknown' ? 'unknown_document' : 'unlinked_document',
        message: doc.docType === 'unknown' ? 'Тип документа не распознан, связанный договор не найден' : 'Не удалось определить, к какому договору относится документ',
        fileNames: [doc.fileName],
      })
      continue
    }
    const entry = byKey.get(normalizeNumber(doc.contractNumber))
    if (!entry) {
      globalIssues.push({
        code: 'missing_contract',
        message: `Документ относится к договору ${doc.contractNumber}, которого нет среди загруженных`,
        fileNames: [doc.fileName],
      })
      continue
    }
    doc.linkedContract = entry.result.key
    entry.linked.push(doc)
  }

  // 3. Apply effective amendments, collect pending changes.
  for (const { result, base, docs, linked } of byKey.values()) {
    linked.sort(docOrder)
    const applied = new Map<string, { change: FoundChange; doc: DocumentInfo }[]>()
    const pending: { change: FoundChange; doc: DocumentInfo; why: Exclude<Applicability, { apply: true }> }[] = []

    for (const doc of linked) {
      const changes = extractChanges(doc, base, fields)
      const why = applicability(doc, checkDate, base.supplier?.value ?? null)
      if (!why.apply && why.issue) {
        result.issues.push({ code: why.issue, message: `${why.text}`, fileNames: [doc.fileName] })
      }
      let role: RelatedDocument['role'] = 'info'
      for (const change of changes) {
        if (why.apply) {
          applied.set(change.field.key, [...(applied.get(change.field.key) ?? []), { change, doc }])
          role = 'applied'
        } else {
          pending.push({ change, doc, why })
          role = 'pending'
        }
      }
      result.relatedDocuments.push({ fileName: doc.fileName, docType: doc.docType, role })
      if (role === 'info') {
        result.infoDocuments.push({
          fileName: doc.fileName,
          docType: doc.docType,
          reasonText: why.apply ? 'Действующее допсоглашение не меняет распознаваемые условия' : `${why.text}; изменений условий не найдено`,
          evidence: infoEvidence(doc),
        })
      }
      const missing = doc.docType === 'letter' ? missingSignedAmendment(doc, linked) : null
      if (missing !== null) {
        result.issues.push({
          code: 'unconfirmed_amendment',
          message: `Письмо ссылается на подписанное допсоглашение${missing ? ` № ${missing}` : ''}, которого нет среди загруженных`,
          fileNames: [doc.fileName],
        })
      }
    }

    for (const [key, list] of applied) {
      const original = base[key]
      const label = list[0].change.field.label
      const evidence = list.map((x) => x.change.evidence)
      // D-13: the latest effective date wins when it is strictly later than the others (list is in docOrder).
      const lastDate = list[list.length - 1].doc.effectiveDate
      const latest = list.filter((x) => x.doc.effectiveDate === lastDate)
      const winner = latest.length === 1 ? latest[0] : null
      const common = {
        evidence,
        clause: original.clause,
        changedBy: (winner ?? list[0]).change.source,
        original: original.value,
        originalEvidence: original.evidence,
      }
      if (!winner) {
        const values = [...new Set(latest.map((x) => x.change.value))]
        const docs = new Set(latest.map((x) => x.doc))
        const names = [...docs].map((d) => d.fileName)
        result.fields[key] = {
          ...common,
          value: values.length === 1 ? values[0] : null,
          status: 'needs_review',
          reason:
            docs.size > 1 ? `Несколько допсоглашений с одной датой вступления в силу меняют поле «${label}»` : `Допсоглашение меняет поле «${label}» несколько раз`,
        }
        result.issues.push({ code: 'amendment_conflict', message: `Поле «${label}» меняют несколько действующих изменений`, fileNames: names, field: key })
      } else if (winner.change.value === null) {
        const reason = winner.change.reason ?? `Изменение поля «${label}» не распознано`
        result.fields[key] = { ...common, value: null, status: 'needs_review', reason }
        result.issues.push({ code: 'unparsed_value', message: reason, fileNames: [winner.doc.fileName], field: key })
      } else {
        result.fields[key] = { ...common, value: winner.change.value, status: 'ok' }
      }
    }

    // A-6: an amendment without an effective date or with an unclear signature leaves the value undetermined.
    for (const { change, doc, why } of pending) {
      if (why.reason !== 'no_effective_date' && why.reason !== 'unclear_signature') continue
      const field = result.fields[change.field.key]
      if (!field || field.status === 'needs_review') continue
      const proposed = change.value === null ? '' : ` (предлагает ${formatValue(change.field.kind, change.value)})`
      result.fields[change.field.key] = {
        ...field,
        status: 'needs_review',
        reason: `Допсоглашение ${doc.fileName} меняет поле «${change.field.label}»${proposed}, но ${lowerFirst(why.text)}: действующее значение не определено`,
      }
    }

    // A-6: a contract signed after the check date is not concluded on that date; values are kept for review.
    const signed = docs.map((d) => d.signDate ?? d.docDate).filter((d): d is string => d !== null).sort()[0]
    if (signed && signed > checkDate) {
      const message = `Договор подписан ${formatIso(signed)}, позже даты проверки ${formatIso(checkDate)}: на дату проверки не заключён`
      result.issues.push({ code: 'not_concluded', message, fileNames: docs.map((d) => d.fileName) })
      for (const f of fields) {
        const field = result.fields[f.key]
        if (f.amendable !== false && field?.status === 'ok') result.fields[f.key] = { ...field, status: 'needs_review', reason: message }
      }
    }

    result.pendingChanges = pending.map(({ change, doc, why }) => {
      let reasonText = change.value === null && change.reason ? `${why.text}; ${change.reason}` : why.text
      if (doc.docType !== 'amendment' && doc.docDate && doc.docDate > checkDate) {
        reasonText = `Документ датирован ${formatIso(doc.docDate)}, позже даты проверки ${formatIso(checkDate)}; ${lowerFirst(reasonText)}`
      }
      return {
        field: change.field.key,
        fieldLabel: change.field.label,
        proposedValue: change.value,
        currentValue: result.fields[change.field.key]?.value ?? null,
        fileName: doc.fileName,
        docType: doc.docType,
        paragraphId: change.evidence.paragraphId,
        quote: change.evidence.quote,
        evidence: change.evidence,
        reason: why.reason,
        reasonText,
        effectiveDate: doc.effectiveDate,
      }
    }) satisfies PendingChange[]

    result.needsReview = result.issues.length > 0 || Object.values(result.fields).some((f) => f.status === 'needs_review')
  }

  contracts.sort((a, b) => a.key.localeCompare(b.key, 'ru', { numeric: true }))
  return { contracts, issues: globalIssues }
}
