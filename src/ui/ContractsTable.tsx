import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { Badge } from '../ds/components/badge'
import { DataTable } from '../ds/components/data-table'
import { cn } from '../ds/lib/utils'
import { FIELDS, formatValue } from '../engine'
import type { ContractResult, FieldValue } from '../engine'
import type { FieldExtractor } from '../engine/fields'

export interface CellRef {
  contractKey: string
  fieldKey: string
}

interface ContractsTableProps {
  contracts: ContractResult[]
  onOpen: (cell: CellRef) => void
  highlight: CellRef | null
  emptyMessage: string
}

// Badges are nowrap by default; in the narrow status column long labels wrap (1024 px).
const WRAP = 'h-auto min-h-ctl-xs whitespace-normal py-1 leading-tight'

export function RowStatus({ contract }: { contract: ContractResult }) {
  const pending = contract.pendingChanges.length > 0
  return (
    <div className="flex flex-col items-start gap-1">
      {contract.needsReview ? <Badge tone="warning" className={WRAP}>требует проверки</Badge> : null}
      {pending ? <Badge tone="info" className={WRAP}>есть несогласованные изменения</Badge> : null}
      {!contract.needsReview && !pending ? <Badge tone="success">ок</Badge> : null}
    </div>
  )
}

function FieldCell({ contract, field, value, onOpen, highlighted }: {
  contract: ContractResult
  field: FieldExtractor
  value: FieldValue
  onOpen: (cell: CellRef) => void
  highlighted: boolean
}) {
  const text = formatValue(field.kind, value.value)
  return (
    <button
      type="button"
      data-testid={`cell-${contract.key}-${field.key}`}
      data-highlighted={highlighted ? 'true' : undefined}
      title="Показать основание"
      onClick={() => onOpen({ contractKey: contract.key, fieldKey: field.key })}
      className={cn(
        'flex w-full flex-col items-start gap-1 rounded-sm px-2 py-1 text-left transition-colors duration-150 hover:hover-paper focus-visible:focus-ring',
        highlighted && 'bg-primary/10 ring-2 ring-primary/40',
      )}
    >
      <span className={cn(value.value === null ? 'text-muted-foreground italic' : 'font-medium text-foreground', field.kind !== 'text' && 'whitespace-nowrap tabular-nums')}>
        {text}
      </span>
      {value.status === 'needs_review' ? (
        <Badge size="sm" tone="warning">
          проверить
        </Badge>
      ) : null}
      {value.changedBy ? (
        <span className="max-w-[200px] text-[11px] leading-snug text-muted-foreground">
          изменено: <span className="font-mono break-all">{value.changedBy.fileName}</span>
          <br />
          было: {formatValue(field.kind, value.original ?? null)}
        </span>
      ) : null}
    </button>
  )
}

/** Columns follow the field registry: a new field (e.g. penalty rate) appears without UI changes. */
export function ContractsTable({ contracts, onOpen, highlight, emptyMessage }: ContractsTableProps) {
  const columns = React.useMemo<ColumnDef<ContractResult>[]>(
    () => [
      ...FIELDS.map<ColumnDef<ContractResult>>((field) => ({
        id: field.key,
        header: field.label,
        cell: ({ row }) => {
          const value = row.original.fields[field.key] ?? { value: null, status: 'no_data', evidence: [] }
          const highlighted = highlight?.contractKey === row.original.key && highlight.fieldKey === field.key
          return <FieldCell contract={row.original} field={field} value={value} onOpen={onOpen} highlighted={highlighted} />
        },
      })),
      { id: 'status', header: 'Статус', cell: ({ row }) => <RowStatus contract={row.original} /> },
    ],
    [onOpen, highlight],
  )
  const table = useReactTable({ data: contracts, columns, getCoreRowModel: getCoreRowModel(), getRowId: (c) => c.key })
  return (
    <div data-testid="contracts-table">
      <DataTable table={table} showPager={false} emptyMessage={emptyMessage} />
    </div>
  )
}
