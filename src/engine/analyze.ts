import { classify } from './classify'
import { splitParagraphs } from './paragraphs'
import { resolve } from './resolve'
import { toIsoDate } from './text'
import type { AnalysisResult, DocumentInfo, InputFile } from './types'

export function parseDocument(file: InputFile): DocumentInfo {
  const paragraphs = splitParagraphs(file.text)
  const c = classify(file.name, paragraphs, file.text)
  return { fileName: file.name, text: file.text, ...c, paragraphs, linkedContract: null }
}

/** Single entry point (contract v1): conditions of every uploaded contract as of `checkDate`. */
export function analyze(files: InputFile[], checkDate: Date): AnalysisResult {
  const checkIso = toIsoDate(checkDate)
  const documents = files.map(parseDocument)
  const { contracts, issues } = resolve(documents, checkIso)
  return { checkDate: checkIso, contracts, documents, issues }
}
