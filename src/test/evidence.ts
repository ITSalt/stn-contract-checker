// Test helpers shared by engine tests (not shipped in the app bundle).
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { AnalysisResult, Evidence, InputFile } from '../engine'

// import.meta.dirname works in both node and jsdom test environments (import.meta.url is not file: in jsdom).
const DOCUMENTS_DIR = join(import.meta.dirname, '../../documents/')

/** The training documents from `documents/`, as uploaded by the user. */
export function loadDocuments(): InputFile[] {
  return readdirSync(DOCUMENTS_DIR)
    .filter((name) => name.endsWith('.txt'))
    .sort()
    .map((name) => ({ name, text: readFileSync(DOCUMENTS_DIR + name, 'utf8') }))
}

/** Every evidence and change quote in the result, with the text of its file. */
export function allQuotes(result: AnalysisResult): { evidence: Evidence | { fileName: string; quote: string }; exact: boolean }[] {
  const out: { evidence: Evidence | { fileName: string; quote: string }; exact: boolean }[] = []
  for (const c of result.contracts) {
    for (const f of Object.values(c.fields)) {
      for (const e of [...f.evidence, ...(f.originalEvidence ?? [])]) out.push({ evidence: e, exact: true })
      if (f.changedBy) out.push({ evidence: f.changedBy, exact: false })
    }
    for (const p of c.pendingChanges) out.push({ evidence: p.evidence, exact: true })
  }
  for (const d of result.documents) {
    for (const e of [d.contractNumberEvidence, d.signStatusEvidence, d.effectiveDateEvidence]) if (e) out.push({ evidence: e, exact: true })
  }
  return out
}

/** Asserts `text.slice(start, end) === quote` for offset evidence and `text.includes(quote)` otherwise. */
export function quoteErrors(result: AnalysisResult): string[] {
  const texts = new Map(result.documents.map((d) => [d.fileName, d.text]))
  const errors: string[] = []
  for (const { evidence, exact } of allQuotes(result)) {
    const text = texts.get(evidence.fileName)
    if (text === undefined) {
      errors.push(`unknown file ${evidence.fileName}`)
    } else if (exact && 'start' in evidence) {
      if (text.slice(evidence.start, evidence.end) !== evidence.quote) errors.push(`${evidence.fileName}: «${evidence.quote}»`)
    } else if (!text.includes(evidence.quote)) {
      errors.push(`${evidence.fileName}: «${evidence.quote}»`)
    }
    if (evidence.quote.trim() === '') errors.push(`${evidence.fileName}: empty quote`)
  }
  return errors
}
