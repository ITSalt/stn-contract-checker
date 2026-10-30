import { describe, expect, it } from 'vitest'
import { parseDocument } from './analyze'

const doc = (text: string) => parseDocument({ name: 'whatever_contract.txt', text })

describe('classify by text, not by file name', () => {
  it('contract with its own number', () => {
    const d = doc('ДОГОВОР ПОСТАВКИ № AB-7/26\nСтатус: подписан обеими сторонами 01.02.2026.')
    expect([d.docType, d.contractNumber, d.signStatus, d.signDate]).toEqual(['contract', 'AB-7/26', 'signed_both', '2026-02-01'])
  })

  it('a file named like a contract can be a letter', () => {
    const d = doc('Письмо\nОт: ООО «А»\nКому: ООО «Б»\n\nПо договору КС-15 просим перенести срок поставки на 01.05.2026.')
    expect([d.docType, d.contractNumber]).toEqual(['letter', 'КС-15'])
  })

  it('draft of an amendment is a draft, even with «подписано» elsewhere', () => {
    const d = doc('ПРОЕКТ ДОПОЛНИТЕЛЬНОГО СОГЛАШЕНИЯ № 3 К ДОГОВОРУ Z-9\nСтатус: проект на согласовании.')
    expect([d.docType, d.contractNumber, d.signStatus]).toEqual(['draft', 'Z-9', 'unsigned'])
  })

  it('amendment: effective date, signature variants', () => {
    const signed = doc('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № 1 К ДОГОВОРУ Z-9\nСтатус: подписано обеими сторонами 03.03.2026.\n4. Настоящее соглашение вступает в силу 05.03.2026.')
    expect([signed.docType, signed.signStatus, signed.effectiveDate]).toEqual(['amendment', 'signed_both', '2026-03-05'])
    const onSigning = doc('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ К ДОГОВОРУ Z-9\nСтатус: подписано сторонами 03.03.2026.\nСоглашение вступает в силу с момента его подписания.')
    expect(onSigning.effectiveDate).toBe('2026-03-03')
    expect(doc('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ К ДОГОВОРУ Z-9\nСтатус: подписано поставщиком.').signStatus).toBe('unclear')
    expect(doc('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ К ДОГОВОРУ Z-9').signStatus).toBe('unclear')
    expect(doc('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ К ДОГОВОРУ Z-9\nСтатус: не подписано.').signStatus).toBe('unsigned')
    const two = doc('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ К ДОГОВОРУ Z-9\nСоглашение вступает в силу 01.03.2026.\nСоглашение вступает в силу 02.03.2026.')
    expect([two.effectiveDate, two.effectiveDateAmbiguous]).toEqual([null, true])
  })

  it('«изменения вступят в силу только после подписания» is not an effective date', () => {
    const d = doc('ПРОЕКТ ДОПОЛНИТЕЛЬНОГО СОГЛАШЕНИЯ К ДОГОВОРУ Z-9\n3. Изменения вступят в силу только после подписания сторонами. По состоянию на 10.03.2026 подписание не состоялось.')
    expect(d.effectiveDate).toBeNull()
  })

  it('a letter mentioning two contracts has no single link', () => {
    const d = doc('ПИСЬМО\nПо договору A-1 и по договору B-2 просим перенести срок поставки на 01.05.2026.')
    expect(d.contractNumber).toBeNull()
    expect(d.mentionedContracts).toEqual(['A-1', 'B-2'])
  })

  it('unknown document', () => {
    expect(doc('Служебная записка\nТекст').docType).toBe('unknown')
  })
})
