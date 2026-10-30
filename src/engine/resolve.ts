// Links documents to contracts by number and applies amendments as of the check date (D-7, A-2).
//
// Rule: a condition changes only by an amendment signed by both parties whose effective date is
// on or before the check date. Signed-but-not-yet-effective amendments, drafts and letters go to
// `pendingChanges`. File names and upload order never decide priority.

import { aggregate, extractByParagraphs, locate } from './fields/common'
import { FIELDS } from './fields'
import type { FieldExtractor } from './fields/types'
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

// «Пункт 2.1 договора изложить в следующей редакции: «…»».
const REPLACE_RE = /(?:пункт|п\.)\s*(\d{1,3}(?:\.\d{1,3})*)\s+(?:настоящего\s+)?договора\s+(?:изложить|читать)\s+в\s+(?:следующей|новой)\s+редакции\s*:?\s*[«"“]/i

/** Changes in an amendment, draft or letter: clause replacements and free-form proposals. */
export function extractChanges(doc: DocumentInfo, contractFields: Record<string, FieldValue>, fields: FieldExtractor[] = FIELDS): FoundChange[] {
  const changes: FoundChange[] = []
  const amendable = fields.filter((f) => f.amendable !== false)
  for (const p of doc.paragraphs) {
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
      continue
    }
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
  return changes
}

type Applicability = { apply: true } | { apply: false; reason: PendingReason; text: string; issue?: IssueCode }

function formatIso(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
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
  const byKey = new Map<string, { result: ContractResult; base: Record<string, FieldValue>; linked: DocumentInfo[] }>()
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
      issues,
      needsReview: false,
    }
    contracts.push(result)
    byKey.set(key, { result, base, linked: [] })
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
  for (const { result, base, linked } of byKey.values()) {
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
    }

    for (const [key, list] of applied) {
      const original = base[key]
      const label = list[0].change.field.label
      const evidence = list.map((x) => x.change.evidence)
      const first = list[0].change
      const common = { evidence, clause: original.clause, changedBy: first.source, original: original.value, originalEvidence: original.evidence }
      const docs = new Set(list.map((x) => x.doc))
      if (list.length > 1) {
        const values = [...new Set(list.map((x) => x.change.value))]
        const names = [...docs].map((d) => d.fileName)
        result.fields[key] = {
          ...common,
          value: values.length === 1 ? values[0] : null,
          status: 'needs_review',
          reason: docs.size > 1 ? `Несколько действующих допсоглашений меняют поле «${label}»` : `Допсоглашение меняет поле «${label}» несколько раз`,
        }
        result.issues.push({ code: 'amendment_conflict', message: `Поле «${label}» меняют несколько действующих изменений`, fileNames: names, field: key })
      } else if (first.value === null) {
        result.fields[key] = { ...common, value: null, status: 'needs_review', reason: first.reason ?? `Изменение поля «${label}» не распознано` }
        result.issues.push({ code: 'unparsed_value', message: first.reason ?? `Изменение поля «${label}» не распознано`, fileNames: [list[0].doc.fileName], field: key })
      } else {
        result.fields[key] = { ...common, value: first.value, status: 'ok' }
      }
    }

    result.pendingChanges = pending.map(({ change, doc, why }) => ({
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
      reasonText: change.value === null && change.reason ? `${why.text}; ${change.reason}` : why.text,
      effectiveDate: doc.effectiveDate,
    })) satisfies PendingChange[]

    result.needsReview = result.issues.length > 0 || Object.values(result.fields).some((f) => f.status === 'needs_review')
  }

  contracts.sort((a, b) => a.key.localeCompare(b.key, 'ru', { numeric: true }))
  return { contracts, issues: globalIssues }
}
