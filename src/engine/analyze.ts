import { classify } from './classify'
import { splitParagraphs } from './paragraphs'
import { resolve } from './resolve'
import { toCheckDate, type DateInput } from './text'
import type { AnalysisResult, DocumentInfo, InputFile } from './types'

export function parseDocument(file: InputFile): DocumentInfo {
  const paragraphs = splitParagraphs(file.text)
  const c = classify(file.name, paragraphs, file.text)
  return { fileName: file.name, text: file.text, ...c, paragraphs, linkedContract: null }
}

/**
 * Single entry point (contract v1): conditions of every uploaded contract as of `checkDate`.
 * `checkDate`: `YYYY-MM-DD` string (recommended) or a Date read as its local calendar day.
 */
export function analyze(files: InputFile[], checkDate: DateInput): AnalysisResult {
  const checkIso = toCheckDate(checkDate)
  const documents = files.map(parseDocument)
  const { contracts, issues } = resolve(documents, checkIso)
  return { checkDate: checkIso, contracts, documents, issues }
}
