// The four user questions from the task. Contract numbers and dates are parameters of the
// question, the answers are always computed by the engine from the uploaded documents.

import { contractAmount, contractsDueBefore, deliveryTermOnDate, NO_DATA } from '../engine'
import type { AnalysisResult, DueBeforeAnswer, FieldAnswer } from '../engine'

export type Question =
  | { id: 'q1'; text: string; kind: 'delivery'; contract: string; date: string }
  | { id: 'q2' | 'q3'; text: string; kind: 'amount'; contract: string }
  | { id: 'q4'; text: string; kind: 'dueBefore'; threshold: string }

export const QUESTIONS: Question[] = [
  { id: 'q1', kind: 'delivery', contract: 'STN-101', date: '2026-03-10', text: 'Какой срок поставки действует по договору STN-101 на 10 марта 2026 года?' },
  { id: 'q2', kind: 'amount', contract: 'STN-102', text: 'Какова сумма договора STN-102?' },
  { id: 'q3', kind: 'amount', contract: 'STN-103', text: 'Какова сумма договора STN-103?' },
  {
    id: 'q4',
    kind: 'dueBefore',
    threshold: '2026-04-01',
    text: 'По каким договорам поставка запланирована раньше 1 апреля 2026 года и есть ли несогласованные изменения срока?',
  },
]

export type Answer = { kind: 'field'; answer: FieldAnswer; fieldKey: string } | { kind: 'dueBefore'; answer: DueBeforeAnswer }

export function answerQuestion(q: Question, result: AnalysisResult): Answer {
  switch (q.kind) {
    case 'delivery':
      return { kind: 'field', answer: deliveryTermOnDate(result, q.contract), fieldKey: 'deliveryDate' }
    case 'amount':
      return { kind: 'field', answer: contractAmount(result, q.contract), fieldKey: 'amount' }
    case 'dueBefore':
      return { kind: 'dueBefore', answer: contractsDueBefore(result, q.threshold) }
  }
}

/** Short answer text; a contract missing from the upload is «нет данных», not a guess. */
export function answerText(a: Answer): string {
  if (a.kind === 'field' && !a.answer.contract) return `${NO_DATA[0].toUpperCase()}${NO_DATA.slice(1)}: ${a.answer.text}`
  return a.answer.text
}
