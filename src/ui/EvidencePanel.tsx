import { Quote } from 'lucide-react'
import * as React from 'react'
import { Badge } from '../ds/components/badge'
import { Button } from '../ds/components/button'
import { Dialog, DialogBody, DialogHeader } from '../ds/components/dialog'
import { cn } from '../ds/lib/utils'
import { fieldByKey, formatValue } from '../engine'
import type { AnalysisResult, DocumentInfo, Evidence, PendingChange } from '../engine'
import type { CellRef } from './ContractsTable'
import { DocumentView, type Highlight } from './DocumentView'
import { docTypeLabel, FIELD_STATUS_LABEL, paragraphAnchor } from './labels'

interface EvidencePanelProps {
  result: AnalysisResult
  cell: CellRef | null
  onClose: () => void
}

function EvidenceQuote({ evidence, onShow }: { evidence: Evidence; onShow: (e: Evidence) => void }) {
  return (
    <figure className="flex flex-col gap-2 rounded-md border border-border bg-card px-4 py-3">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-foreground">
          {evidence.fileName} · {evidence.paragraphId}
        </span>
        <Button variant="ghost" size="sm" onClick={() => onShow(evidence)}>
          Показать в тексте
        </Button>
      </figcaption>
      <blockquote className="flex gap-2 text-[13px] leading-relaxed text-foreground">
        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        <span>«{evidence.quote}»</span>
      </blockquote>
    </figure>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="it-eyebrow">{title}</h3>
      {children}
    </section>
  )
}

/** `doc` is the source document: its type label uses the real signature status, not a guess. */
export function PendingItem({ change, doc, onShow }: { change: PendingChange; doc: DocumentInfo | undefined; onShow: (e: Evidence) => void }) {
  const field = fieldByKey(change.field)
  const type = docTypeLabel({ docType: change.docType, signStatus: doc?.signStatus ?? 'unclear' })
  return (
    <div data-testid="pending-item" className="flex flex-col gap-2 rounded-md border border-dashed border-border-strong bg-surface-sunk/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-foreground">
          {change.fieldLabel}: {field ? formatValue(field.kind, change.proposedValue) : String(change.proposedValue)}
        </span>
        <Badge size="sm" tone={type.tone}>
          {type.label}
        </Badge>
        <Badge size="sm" tone="warning">
          не действует
        </Badge>
      </div>
      <p className="it-small text-muted-foreground">{change.reasonText}</p>
      <EvidenceQuote evidence={change.evidence} onShow={onShow} />
    </div>
  )
}

/** Side panel «Основание»: file, exact quote, full text with the paragraph highlighted. */
export function EvidencePanel({ result, cell, onClose }: EvidencePanelProps) {
  const contract = cell ? result.contracts.find((c) => c.key === cell.contractKey) : undefined
  const field = cell ? fieldByKey(cell.fieldKey) : undefined
  const value = contract && field ? contract.fields[field.key] : undefined
  const evidence = value?.evidence ?? []
  const original = value?.originalEvidence ?? []
  const pending = contract && field ? contract.pendingChanges.filter((p) => p.field === field.key) : []
  const otherPending = contract && field ? contract.pendingChanges.filter((p) => p.field !== field.key) : []

  const files = React.useMemo(() => {
    const names = [...evidence, ...original, ...pending.map((p) => p.evidence)].map((e) => e.fileName)
    for (const r of contract?.relatedDocuments ?? []) names.push(r.fileName)
    return [...new Set(names)]
  }, [contract, evidence, original, pending])
  const highlights: Highlight[] = [...evidence, ...original, ...pending.map((p) => p.evidence)]

  const first = evidence[0] ?? original[0] ?? null
  const [viewFile, setViewFile] = React.useState<string | null>(null)
  const [focusId, setFocusId] = React.useState<string | null>(null)
  // Incremented by «Показать в тексте»: scroll the panel to the document text (not on open).
  const [jump, setJump] = React.useState(0)
  const textSection = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (jump > 0) textSection.current?.scrollIntoView?.({ block: 'start' })
  }, [jump])
  React.useEffect(() => {
    setViewFile(first?.fileName ?? files[0] ?? null)
    setFocusId(first ? paragraphAnchor(first.fileName, first.paragraphId) : null)
    // Reset the viewer only when another cell is opened.
  }, [cell?.contractKey, cell?.fieldKey])

  const show = (e: Evidence) => {
    setViewFile(e.fileName)
    setFocusId(paragraphAnchor(e.fileName, e.paragraphId))
    setJump((n) => n + 1)
  }
  const doc = result.documents.find((d) => d.fileName === viewFile)
  const docOf = (name: string) => result.documents.find((d) => d.fileName === name)

  return (
    <Dialog open={Boolean(contract && field && value)} onOpenChange={(open) => !open && onClose()} placement="side" size="xl" data-testid="evidence-panel">
      {contract && field && value ? (
        <>
          <DialogHeader title={`Основание: ${field.label}`} meta={`Договор ${contract.number ?? contract.fileName} · проверка на ${formatValue('date', result.checkDate)}`} />
          <DialogBody className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="it-h3 text-foreground" data-testid="evidence-value">
                {formatValue(field.kind, value.value)}
              </span>
              {value.status !== 'no_data' ? <Badge tone={value.status === 'ok' ? 'success' : 'warning'}>{FIELD_STATUS_LABEL[value.status]}</Badge> : null}
            </div>
            {value.reason && value.status !== 'ok' ? <p className="text-sm text-foreground">{value.reason}</p> : null}

            {value.changedBy ? (
              <p className="text-sm text-foreground">
                Изменено документом <span className="font-mono">{value.changedBy.fileName}</span>; по договору было{' '}
                <span className="font-medium">{formatValue(field.kind, value.original ?? null)}</span>.
              </p>
            ) : null}

            <Section title={value.changedBy ? 'Действующая редакция (допсоглашение)' : 'Цитата'}>
              {evidence.length > 0 ? (
                evidence.map((e) => <EvidenceQuote key={`${e.fileName}-${e.start}`} evidence={e} onShow={show} />)
              ) : (
                <p className="it-small text-muted-foreground">Цитаты нет: пункт о поле «{field.label}» в тексте не найден.</p>
              )}
            </Section>

            {original.length > 0 ? (
              <Section title="Исходная редакция (договор)">
                {original.map((e) => (
                  <EvidenceQuote key={`${e.fileName}-${e.start}`} evidence={e} onShow={show} />
                ))}
              </Section>
            ) : null}

            {pending.length > 0 || otherPending.length > 0 ? (
              <Section title="Сведения для проверки (не действуют)">
                {[...pending, ...otherPending].map((p) => (
                  <PendingItem key={`${p.fileName}-${p.field}-${p.paragraphId}`} change={p} doc={docOf(p.fileName)} onShow={show} />
                ))}
              </Section>
            ) : null}

            {doc ? (
              <div ref={textSection} className="scroll-mt-4">
              <Section title="Текст документа">
                <div className="flex flex-wrap gap-1" role="group" aria-label="Документы договора">
                  {files.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setViewFile(name)
                        setFocusId(null)
                      }}
                      className={cn(
                        'rounded-sm border px-2 py-1 font-mono text-[11px] transition-colors duration-150 focus-visible:focus-ring',
                        name === viewFile ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:hover-paper',
                      )}
                      aria-pressed={name === viewFile}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <DocumentView doc={doc} highlights={highlights} focusId={focusId} jump={jump} />
              </Section>
              </div>
            ) : null}
          </DialogBody>
        </>
      ) : null}
    </Dialog>
  )
}
