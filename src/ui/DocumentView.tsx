import * as React from 'react'
import { cn } from '../ds/lib/utils'
import type { DocumentInfo } from '../engine'
import { paragraphAnchor } from './labels'

export interface Highlight {
  fileName: string
  start: number
  end: number
}

/** Full document text by paragraphs; paragraphs with a quote are highlighted, the quote is marked. */
export function DocumentView({ doc, highlights, focusId, jump = 0 }: { doc: DocumentInfo; highlights: Highlight[]; focusId: string | null; jump?: number }) {
  const own = highlights.filter((h) => h.fileName === doc.fileName)
  const box = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    // Scroll only the text box, not the panel around it: the value and quotes stay in view.
    const container = box.current
    const el = focusId ? document.getElementById(focusId) : null
    if (!container || !el) return
    container.scrollTop = Math.max(0, el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2)
  }, [focusId, doc.fileName, jump])

  return (
    <div ref={box} className="relative max-h-[360px] overflow-y-auto rounded-md border border-border bg-card px-4 py-3" data-testid="document-view">
      {doc.paragraphs.map((p) => {
        const hit = own.find((h) => h.start < p.end && h.end > p.start)
        const id = paragraphAnchor(doc.fileName, p.id)
        return (
          <p
            key={p.id}
            id={id}
            data-highlighted={hit ? 'true' : undefined}
            data-testid={focusId === id ? 'focused-paragraph' : undefined}
            className={cn('my-1 rounded-sm px-2 py-1 text-[13px] leading-relaxed text-foreground', hit && 'bg-primary/10', focusId === id && 'ring-1 ring-primary/50')}
          >
            <span className="mr-2 select-none font-mono text-[10px] text-ink-faint">{p.id}</span>
            {hit ? <Marked text={p.text} offset={p.start} start={hit.start} end={hit.end} /> : p.text}
          </p>
        )
      })}
    </div>
  )
}

function Marked({ text, offset, start, end }: { text: string; offset: number; start: number; end: number }) {
  const a = Math.max(0, start - offset)
  const b = Math.min(text.length, end - offset)
  return (
    <>
      {text.slice(0, a)}
      <mark className="rounded-[2px] bg-primary/25 px-0.5 text-foreground">{text.slice(a, b)}</mark>
      {text.slice(b)}
    </>
  )
}
