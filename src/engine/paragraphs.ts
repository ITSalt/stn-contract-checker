import type { Paragraph } from './types'

const CLAUSE_RE = /^(\d{1,3}(?:\.\d{1,3}){0,3})(?:[.)](?=\s)|(?=\s))\s*/

/** Splits text into paragraphs (non-empty lines) with ids `p1…pn`, clause numbers and offsets. */
export function splitParagraphs(text: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  let lineStart = 0
  while (lineStart <= text.length) {
    const newline = text.indexOf('\n', lineStart)
    const lineEnd = newline === -1 ? text.length : newline
    let start = lineStart
    let end = lineEnd
    while (start < end && /[\s﻿]/.test(text[start])) start++
    while (end > start && /\s/.test(text[end - 1])) end--
    if (end > start) {
      const content = text.slice(start, end)
      const clause = CLAUSE_RE.exec(content)
      const bodyOffset = clause ? clause[0].length : 0
      paragraphs.push({
        id: `p${paragraphs.length + 1}`,
        clause: clause ? clause[1] : null,
        text: content,
        start,
        end,
        body: content.slice(bodyOffset),
        bodyStart: start + bodyOffset,
      })
    }
    if (newline === -1) break
    lineStart = newline + 1
  }
  return paragraphs
}
