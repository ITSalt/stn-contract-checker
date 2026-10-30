import type { BadgeTone } from '../ds/components/badge'
import type { DocumentInfo, FieldStatus, SignStatus } from '../engine'

export function docTypeLabel(doc: Pick<DocumentInfo, 'docType' | 'signStatus'>): { label: string; tone: BadgeTone } {
  switch (doc.docType) {
    case 'contract':
      return { label: 'Договор', tone: 'neutral' }
    case 'amendment':
      return doc.signStatus === 'signed_both'
        ? { label: 'Подписанное допсоглашение', tone: 'success' }
        : { label: 'Допсоглашение без подписи', tone: 'warning' }
    case 'draft':
      return { label: 'Проект', tone: 'warning' }
    case 'letter':
      return { label: 'Письмо', tone: 'info' }
    default:
      return { label: 'Не распознан', tone: 'danger' }
  }
}

export const SIGN_STATUS_LABEL: Record<SignStatus, string> = {
  signed_both: 'подписан обеими сторонами',
  unsigned: 'не подписан',
  unclear: 'статус подписания неясен',
}

export const FIELD_STATUS_LABEL: Record<FieldStatus, string> = {
  ok: 'ок',
  no_data: 'нет данных',
  needs_review: 'требует проверки',
}

/** Anchor of a paragraph in the document viewer: `#<file>-<paragraphId>`. */
export function paragraphAnchor(fileName: string, paragraphId: string): string {
  return `${fileName}-${paragraphId}`
}
