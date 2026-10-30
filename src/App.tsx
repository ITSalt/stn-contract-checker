import { FileSearch, MessageCircleQuestion, RotateCcw } from 'lucide-react'
import * as React from 'react'
import { Alert } from './ds/components/alert'
import { Button } from './ds/components/button'
import { EmptyState } from './ds/components/empty-state'
import { FormField } from './ds/components/form-field'
import { Input } from './ds/components/input'
import { PageHeader } from './ds/components/page-header'
import { Panel, PanelBody, PanelHeader } from './ds/components/panel'
import { analyze, contractsDueBefore, formatDate } from './engine'
import type { Evidence, InputFile } from './engine'
import { ContractsTable, type CellRef } from './ui/ContractsTable'
import { EvidencePanel, InfoItem, PendingItem } from './ui/EvidencePanel'
import { answerQuestion, answerText, QUESTIONS, type Question } from './ui/questions'
import { UploadPanel } from './ui/UploadPanel'

const DEFAULT_CHECK_DATE = '2026-03-10'
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

interface Filters {
  beforeEnabled: boolean
  before: string
  pendingOnly: boolean
  search: string
}

const NO_FILTERS: Filters = { beforeEnabled: false, before: '2026-04-01', pendingOnly: false, search: '' }

export default function App() {
  const [files, setFiles] = React.useState<InputFile[]>([])
  const [checkDate, setCheckDate] = React.useState(DEFAULT_CHECK_DATE)
  const [filters, setFilters] = React.useState<Filters>(NO_FILTERS)
  const [question, setQuestion] = React.useState<Question | null>(null)
  const [openCell, setOpenCell] = React.useState<CellRef | null>(null)
  // Set when question 1 moved the check date: the date it replaced, so the change is never silent.
  const [dateWas, setDateWas] = React.useState<string | null>(null)

  const result = React.useMemo(() => analyze(files, checkDate), [files, checkDate])

  const addFiles = React.useCallback((added: InputFile[]) => {
    setFiles((prev) => [...prev.filter((f) => !added.some((a) => a.name === f.name)), ...added])
  }, [])

  const due = filters.beforeEnabled && ISO_DAY.test(filters.before) ? contractsDueBefore(result, filters.before) : null
  const dueKeys = due ? new Set(due.items.map((i) => i.contract.key)) : null
  const search = filters.search.trim().toLowerCase()
  const visible = result.contracts.filter((c) => {
    if (dueKeys && !dueKeys.has(c.key)) return false
    if (filters.pendingOnly && c.pendingChanges.length === 0) return false
    if (search) {
      const hay = `${c.number ?? ''} ${c.fields.supplier?.value ?? ''}`.toLowerCase()
      if (!hay.includes(search)) return false
    }
    return true
  })
  const filtered = filters.beforeEnabled || filters.pendingOnly || search !== ''

  const answer = question ? answerQuestion(question, result) : null
  const highlight: CellRef | null =
    answer?.kind === 'field' && answer.answer.contract ? { contractKey: answer.answer.contract.key, fieldKey: answer.fieldKey } : null

  const ask = (q: Question) => {
    setQuestion(q)
    if (q.kind === 'dueBefore') {
      setDateWas(null)
      setFilters({ ...NO_FILTERS, beforeEnabled: true, before: q.threshold })
    } else {
      setFilters(NO_FILTERS)
      if (q.kind === 'delivery') {
        setDateWas(checkDate !== q.date ? checkDate : null)
        setCheckDate(q.date)
      } else {
        setDateWas(null)
      }
    }
  }

  const openEvidence = (e: Evidence) => {
    const contract = result.contracts.find((c) => c.pendingChanges.some((p) => p.evidence === e))
    const change = contract?.pendingChanges.find((p) => p.evidence === e)
    if (contract && change) {
      setOpenCell({ contractKey: contract.key, fieldKey: change.field })
      return
    }
    // A document that changes nothing has no field of its own: open the panel on the contract's amount.
    const info = result.contracts.find((c) => c.infoDocuments.some((i) => i.evidence === e))
    if (info) setOpenCell({ contractKey: info.key, fieldKey: 'amount' })
  }

  const allPending = result.contracts.flatMap((c) => c.pendingChanges.map((p) => ({ contract: c, change: p })))
  const allInfo = result.contracts.flatMap((c) => c.infoDocuments.map((i) => ({ contract: c, info: i })))

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Проверка договоров поставки"
        title="Условия договоров на дату проверки"
        description="Сумма и срок поставки по каждому договору с учётом подписанных и вступивших в силу допсоглашений. Каждое значение открывается с цитатой из исходного документа."
        actions={
          <FormField label="Дата проверки">
            <Input
              type="date"
              size="md"
              data-testid="check-date"
              value={checkDate}
              onChange={(e) => {
                if (!ISO_DAY.test(e.target.value)) return
                setCheckDate(e.target.value)
                // Question 1 is asked «на 10 марта 2026»: another date is no longer that question.
                if (question?.kind === 'delivery') setQuestion(null)
                setDateWas(null)
              }}
              className="w-[170px]"
            />
          </FormField>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <UploadPanel
          result={result}
          onAdd={addFiles}
          onRemove={(name) => setFiles((prev) => prev.filter((f) => f.name !== name))}
          onClear={() => {
            setFiles([])
            setQuestion(null)
            setFilters(NO_FILTERS)
          }}
        />

        <Panel>
          <PanelHeader>
            <h2 className="it-h4">Быстрые вопросы</h2>
          </PanelHeader>
          <PanelBody className="flex flex-col gap-3">
            <div className="grid gap-2">
              {QUESTIONS.map((q, i) => (
                <Button
                  key={q.id}
                  variant={question?.id === q.id ? 'default' : 'outline'}
                  size="sm"
                  data-testid={`question-${i + 1}`}
                  className="h-auto min-h-ctl-md justify-start whitespace-normal py-2 text-left"
                  onClick={() => ask(q)}
                >
                  <MessageCircleQuestion className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  {q.text}
                </Button>
              ))}
            </div>
            {answer ? (
              <Alert
                tone={answer.kind === 'field' && answer.answer.field?.status === 'ok' ? 'success' : 'info'}
                data-testid="answer"
                action={
                  answer.kind === 'field' && highlight ? (
                    <Button size="sm" variant="outline" onClick={() => setOpenCell(highlight)}>
                      Основание
                    </Button>
                  ) : null
                }
              >
                <p className="font-medium">{answerText(answer)}</p>
              </Alert>
            ) : null}
            {answer && question?.kind === 'delivery' && dateWas ? (
              <Alert
                tone="warning"
                data-testid="date-changed"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="date-restore"
                    onClick={() => {
                      setCheckDate(dateWas)
                      setQuestion(null)
                      setDateWas(null)
                    }}
                  >
                    Вернуть {formatDate(dateWas)}
                  </Button>
                }
              >
                <p className="font-medium">
                  Дата проверки изменена на {formatDate(question.date)} (дата из вопроса), была {formatDate(dateWas)}
                </p>
              </Alert>
            ) : null}
          </PanelBody>
        </Panel>
      </div>

      {result.issues.length > 0 ? (
        <Alert tone="warning" data-testid="global-issues">
          <p className="font-medium">Требует проверки</p>
          <ul className="mt-1 list-disc pl-5">
            {result.issues.map((issue) => (
              <li key={`${issue.code}-${issue.fileNames.join(',')}`}>
                <span className="font-mono">{issue.fileNames.join(', ')}</span>: {issue.message}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <Panel>
        <PanelHeader>
          <div className="flex w-full flex-wrap items-end gap-4">
            <h2 className="it-h4 mr-auto self-center">Договоры на {formatDate(result.checkDate)}</h2>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                data-testid="filter-before-enabled"
                checked={filters.beforeEnabled}
                onChange={(e) => setFilters({ ...filters, beforeEnabled: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              срок поставки раньше
            </label>
            <Input
              type="date"
              size="md"
              aria-label="Срок поставки раньше даты"
              data-testid="filter-before"
              value={filters.before}
              onChange={(e) => setFilters({ ...filters, before: e.target.value, beforeEnabled: true })}
              className="w-[160px]"
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                data-testid="filter-pending"
                checked={filters.pendingOnly}
                onChange={(e) => setFilters({ ...filters, pendingOnly: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              есть несогласованные изменения
            </label>
            <Input
              size="md"
              placeholder="Номер или поставщик"
              aria-label="Поиск по номеру или поставщику"
              data-testid="filter-search"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-[200px]"
            />
            {filtered ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters(NO_FILTERS)
                  setQuestion(null)
                }}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                Сбросить фильтры
              </Button>
            ) : null}
          </div>
        </PanelHeader>
        <PanelBody>
          {result.documents.length === 0 ? (
            <EmptyState
              icon={<FileSearch className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />}
              title="Документы не загружены"
              description="Загрузите договоры, допсоглашения и письма в формате TXT — таблица условий появится здесь."
            />
          ) : (
            <>
              <ContractsTable
                contracts={visible}
                onOpen={setOpenCell}
                highlight={highlight}
                emptyMessage={filtered ? 'Нет договоров, подходящих под фильтры' : 'Договоры среди загруженных документов не найдены'}
              />
              {due && due.undetermined.length > 0 ? (
                <p className="it-small mt-3 text-muted-foreground" data-testid="undetermined">
                  Срок не определён, в фильтр не попали: {due.undetermined.map((c) => c.number ?? c.fileName).join(', ')}
                </p>
              ) : null}
            </>
          )}
        </PanelBody>
      </Panel>

      {allPending.length > 0 || allInfo.length > 0 ? (
        <Panel data-testid="pending-section">
          <PanelHeader>
            <div>
              <h2 className="it-h4">Сведения для проверки (не действуют)</h2>
              <p className="it-small mt-1 text-muted-foreground">
                Письма, проекты и допсоглашения, которые не подписаны или не вступили в силу на {formatDate(result.checkDate)}. Условия договора они не меняют.
              </p>
            </div>
          </PanelHeader>
          <PanelBody className="grid gap-3 lg:grid-cols-2">
            {allPending.map(({ contract, change }) => (
              <div key={`${contract.key}-${change.fileName}-${change.field}-${change.paragraphId}`} className="flex flex-col gap-1">
                <span className="font-mono text-xs text-muted-foreground">Договор {contract.number ?? contract.fileName}</span>
                <PendingItem change={change} doc={result.documents.find((d) => d.fileName === change.fileName)} onShow={openEvidence} />
              </div>
            ))}
            {allInfo.map(({ contract, info }) => (
              <div key={`${contract.key}-${info.fileName}-info`} className="flex flex-col gap-1">
                <span className="font-mono text-xs text-muted-foreground">Договор {contract.number ?? contract.fileName}</span>
                <InfoItem info={info} doc={result.documents.find((d) => d.fileName === info.fileName)} onShow={openEvidence} />
              </div>
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      <EvidencePanel result={result} cell={openCell} onClose={() => setOpenCell(null)} />
    </main>
  )
}
