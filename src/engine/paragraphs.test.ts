import { describe, expect, it } from 'vitest'
import { splitParagraphs } from './paragraphs'

describe('splitParagraphs', () => {
  it('numbers non-empty lines p1…pn with clause numbers and exact offsets', () => {
    const text = '﻿ДОГОВОР № X-1\r\n\r\n  2.1. Общая стоимость.  \n3. Пункт 2.1 изложить\n05.02.2026 подписан'
    const ps = splitParagraphs(text)
    expect(ps.map((p) => [p.id, p.clause, p.body])).toEqual([
      ['p1', null, 'ДОГОВОР № X-1'],
      ['p2', '2.1', 'Общая стоимость.'],
      ['p3', '3', 'Пункт 2.1 изложить'],
      ['p4', null, '05.02.2026 подписан'],
    ])
    for (const p of ps) {
      expect(text.slice(p.start, p.end)).toBe(p.text)
      expect(text.slice(p.bodyStart, p.end)).toBe(p.body)
    }
  })
})
