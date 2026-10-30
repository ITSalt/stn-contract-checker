import { FileText, FolderOpen, Trash2, Upload, X } from 'lucide-react'
import * as React from 'react'
import { Badge } from '../ds/components/badge'
import { Button } from '../ds/components/button'
import { IconButton } from '../ds/components/icon-button'
import { Panel, PanelBody, PanelHeader } from '../ds/components/panel'
import { cn } from '../ds/lib/utils'
import type { AnalysisResult, InputFile } from '../engine'
import { docTypeLabel, SIGN_STATUS_LABEL } from './labels'

/** Reads browser files as text; only `.txt` is accepted, the rest is returned as skipped. */
export async function readTextFiles(list: FileList | File[]): Promise<{ files: InputFile[]; skipped: string[] }> {
  const all = Array.from(list)
  const txt = all.filter((f) => f.name.toLowerCase().endsWith('.txt'))
  const skipped = all.filter((f) => !txt.includes(f)).map((f) => f.name)
  return { files: await Promise.all(txt.map(async (f) => ({ name: f.name, text: await f.text() }))), skipped }
}

/** Loads the training set from `public/samples/` (same files as `documents/`, analyzed like any upload). */
export async function fetchSamples(): Promise<InputFile[]> {
  const base = import.meta.env.BASE_URL
  const names: string[] = await (await fetch(`${base}samples/index.json`)).json()
  return Promise.all(names.map(async (name) => ({ name, text: await (await fetch(`${base}samples/${encodeURIComponent(name)}`)).text() })))
}

interface UploadPanelProps {
  result: AnalysisResult
  onAdd: (files: InputFile[]) => void
  onRemove: (name: string) => void
  onClear: () => void
}

export function UploadPanel({ result, onAdd, onRemove, onClear }: UploadPanelProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [skipped, setSkipped] = React.useState<string[]>([])
  const numberByKey = new Map(result.contracts.map((c) => [c.key, c.number ?? c.fileName]))

  const add = async (list: FileList | File[] | null) => {
    if (!list) return
    const read = await readTextFiles(list)
    setSkipped(read.skipped)
    if (read.files.length > 0) onAdd(read.files)
  }

  return (
    <Panel>
      <PanelHeader>
        <div className="flex w-full items-center justify-between gap-3">
          <h2 className="it-h4">Документы</h2>
          {result.documents.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              Очистить всё
            </Button>
          ) : null}
        </div>
      </PanelHeader>
      <PanelBody className="flex flex-col gap-4">
        <div
          data-testid="dropzone"
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void add(e.dataTransfer.files)
          }}
          className={cn(
            'flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong px-4 py-5 text-center transition-colors duration-150',
            dragging ? 'bg-primary/5' : 'bg-surface-sunk/40',
          )}
        >
          <p className="it-small text-muted-foreground">Перетащите TXT-файлы сюда или выберите их</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              Выбрать файлы
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLoadError(null)
                fetchSamples().then(onAdd, () => setLoadError('Учебный комплект не загрузился'))
              }}
            >
              <FolderOpen className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              Загрузить учебный комплект
            </Button>
          </div>
          <input
            ref={inputRef}
            data-testid="file-input"
            aria-label="Загрузить TXT-файлы"
            type="file"
            accept=".txt,text/plain"
            multiple
            className="sr-only"
            onChange={(e) => {
              void add(e.target.files)
              e.target.value = ''
            }}
          />
          {loadError ? <p className="it-small text-destructive">{loadError}</p> : null}
          {skipped.length > 0 ? <p className="it-small text-destructive">Принимаются только TXT, пропущены: {skipped.join(', ')}</p> : null}
        </div>

        {result.documents.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border-paper" aria-label="Загруженные документы">
            {result.documents.map((doc) => {
              const type = docTypeLabel(doc)
              const linked = doc.linkedContract ? numberByKey.get(doc.linkedContract) : null
              return (
                <li key={doc.fileName} className="flex items-center gap-3 py-2" data-testid={`doc-${doc.fileName}`}>
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-foreground" title={doc.fileName}>
                      {doc.fileName}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge size="sm" tone={type.tone}>
                        {type.label}
                      </Badge>
                      {doc.docType !== 'letter' && doc.docType !== 'draft' ? <span>{SIGN_STATUS_LABEL[doc.signStatus]}</span> : null}
                      <span>{linked ? `→ ${linked}` : doc.docType === 'contract' ? '' : 'договор не определён'}</span>
                    </div>
                  </div>
                  <IconButton size="sm" aria-label={`Удалить ${doc.fileName}`} onClick={() => onRemove(doc.fileName)}>
                    <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </IconButton>
                </li>
              )
            })}
          </ul>
        ) : null}
      </PanelBody>
    </Panel>
  )
}
