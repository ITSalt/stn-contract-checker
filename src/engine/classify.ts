// Document classification by text only (A-2): type, linked contract, signature, effective date.
// The file name is never read here.

import { findDates, normalizeNumber, sentences } from './text'
import type { DocType, Evidence, Paragraph, SignStatus } from './types'

export interface Classification {
  docType: DocType
  title: string
  contractNumber: string | null
  contractNumberEvidence?: Evidence
  mentionedContracts: string[]
  signStatus: SignStatus
  signStatusEvidence?: Evidence
  signDate: string | null
  effectiveDate: string | null
  effectiveDateEvidence?: Evidence
  /** Several different effective dates were found. */
  effectiveDateAmbiguous: boolean
  docDate: string | null
}

function evidence(fileName: string, p: Paragraph, start = p.start, end = p.end): Evidence {
  return { fileName, paragraphId: p.id, quote: p.text.slice(start - p.start, end - p.start), start, end }
}

function detectType(title: string, status: string, text: string): DocType {
  const t = title.toUpperCase()
  if (/ПРОЕКТ/.test(t) || /(^|[^а-яё])проект/i.test(status)) return 'draft'
  if (/СОГЛАШЕНИ/.test(t)) return 'amendment'
  if (t.startsWith('ДОГОВОР')) return 'contract'
  if (/ПИСЬМО/.test(t) || (/^\s*От\s*:/im.test(text) && /^\s*Кому\s*:/im.test(text))) return 'letter'
  return 'unknown'
}

function detectSignStatus(status: string | null, docType: DocType): SignStatus {
  if (docType === 'letter' || docType === 'draft') return 'unsigned'
  if (status === null) return 'unclear'
  const s = status.toLowerCase()
  if (/не\s+подписан|ни\s+одной\s+стороной|на\s+согласовании|(^|[^а-яё])проект/.test(s)) return 'unsigned'
  if (/подписан\S*\s+(?:обеими|двумя|всеми)\s+сторонами|подписан\S*\s+сторонами/.test(s)) return 'signed_both'
  return 'unclear'
}

// Contract number token: anything up to whitespace or punctuation, must contain a digit.
const NUMBER_TOKEN = String.raw`([^\s,;:«»"()]*\d[^\s,;:«»"()]*)`
// Without «№» the token must start with a letter (AB-12), so «договора 2.1» is not a number.
const LETTERED_TOKEN = String.raw`([A-Za-zА-ЯЁа-яё][^\s,;:«»"()]*\d[^\s,;:«»"()]*)`

function cleanNumber(raw: string): string {
  return raw.replace(/[.]+$/, '')
}

interface NumberHit {
  number: string
  paragraph: Paragraph
  start: number
  end: number
}

function numberHits(paragraphs: Paragraph[], re: RegExp): NumberHit[] {
  const hits: NumberHit[] = []
  for (const p of paragraphs) {
    for (const m of p.text.matchAll(re)) {
      const group = m.slice(1).find((g) => g !== undefined) ?? ''
      const offset = m.index + m[0].lastIndexOf(group)
      const number = cleanNumber(group)
      hits.push({ number, paragraph: p, start: p.start + offset, end: p.start + offset + number.length })
    }
  }
  return hits
}

/**
 * Other numbers of the same series anywhere in the text («по договорам STN-301 и STN-302»,
 * «условия договора STN-302»): a document naming several contracts must not be linked to the first.
 */
function sameSeriesHits(paragraphs: Paragraph[], hits: NumberHit[]): NumberHit[] {
  const prefixes = new Set<string>()
  for (const h of hits) {
    const m = /^([A-Za-zА-ЯЁа-яё]+[-‐‑–—/]?)\d/.exec(h.number)
    if (m) prefixes.add(m[1])
  }
  const found: NumberHit[] = []
  for (const prefix of prefixes) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&')
    found.push(...numberHits(paragraphs, new RegExp(`(?<![A-Za-zА-ЯЁа-яё0-9-])(${escaped}\\d[^\\s,;:«»"()]*)`, 'gi')))
  }
  return found
}

export function classify(fileName: string, paragraphs: Paragraph[], text: string): Classification {
  const titleParagraph = paragraphs[0]
  const title = titleParagraph?.text ?? ''
  const statusParagraph = paragraphs.find((p) => /^Статус\s*:/i.test(p.text)) ?? null
  const status = statusParagraph ? statusParagraph.text.replace(/^Статус\s*:\s*/i, '') : ''
  const docType = detectType(title, status, text)

  // Linked or own contract number.
  let hits: NumberHit[] = []
  if (titleParagraph) {
    if (docType === 'contract') {
      hits = numberHits([titleParagraph], new RegExp(`№\\s*${NUMBER_TOKEN}`, 'g'))
    } else {
      hits = numberHits([titleParagraph], new RegExp(`к\\s+договору(?:\\s+поставки)?\\s+(?:№\\s*)?${NUMBER_TOKEN}`, 'gi'))
    }
  }
  if (hits.length === 0 && docType !== 'contract') {
    // Body mentions: «по договору AB-12», «Тема: договор № 45».
    hits = numberHits(
      paragraphs,
      new RegExp(`договор[а-яё]*(?:\\s+поставки)?\\s+(?:№\\s*${NUMBER_TOKEN}|${LETTERED_TOKEN})`, 'gi'),
    )
  }
  if (docType !== 'contract') hits = [...hits, ...sameSeriesHits(paragraphs, hits)]
  const mentioned = [...new Map(hits.map((h) => [normalizeNumber(h.number), h.number])).values()]
  const first = hits[0]
  const contractNumber = mentioned.length === 1 ? mentioned[0] : null

  // Signature.
  const signStatus = detectSignStatus(statusParagraph ? status : null, docType)
  const signDates = statusParagraph ? findDates(statusParagraph.text) : []
  const signDate = signStatus === 'signed_both' && signDates.length > 0 ? signDates[signDates.length - 1].value : null

  // Effective date: sentence «вступает в силу DD.MM.YYYY» or «с момента подписания».
  const effective: { value: string; evidence: Evidence }[] = []
  for (const p of paragraphs) {
    for (const s of sentences(p.text)) {
      const sentence = p.text.slice(s.start, s.end)
      if (!/вступа\S*\s+в\s+силу/i.test(sentence)) continue
      if (/только\s+после/i.test(sentence)) continue
      const dates = findDates(sentence).filter((d) => d.value !== null)
      const ev = evidence(fileName, p, p.start + s.start, p.start + s.end)
      if (dates.length > 0) {
        for (const d of dates) effective.push({ value: d.value as string, evidence: ev })
      } else if (/с\s+(?:момента|даты|дня)\s+(?:его\s+|е[её]\s+)?подписания/i.test(sentence) && signDate) {
        effective.push({ value: signDate, evidence: ev })
      }
    }
  }
  const effectiveValues = [...new Set(effective.map((e) => e.value))]

  // Document date: «Дата: …», «Дата проекта: …».
  const dateParagraph = paragraphs.find((p) => /^Дата[^:]{0,20}:/i.test(p.text))
  const docDate = dateParagraph ? (findDates(dateParagraph.text)[0]?.value ?? null) : null

  return {
    docType,
    title,
    contractNumber,
    contractNumberEvidence: contractNumber && first ? evidence(fileName, first.paragraph, first.start, first.end) : undefined,
    mentionedContracts: mentioned,
    signStatus,
    signStatusEvidence: statusParagraph ? evidence(fileName, statusParagraph) : undefined,
    signDate,
    effectiveDate: effectiveValues.length === 1 ? effectiveValues[0] : null,
    effectiveDateEvidence: effectiveValues.length === 1 ? effective[0].evidence : undefined,
    effectiveDateAmbiguous: effectiveValues.length > 1,
    docDate,
  }
}

