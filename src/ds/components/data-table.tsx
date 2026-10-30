/**
 * DataTable — headless wrapper around a caller-provided @tanstack/react-table
 * instance, styled per the `.adm-table` / `.adm-tablefoot` / `.adm-pager` DS recipes.
 *
 * The wrapper only owns markup (mono uppercase header, row hover/selected
 * states, the sticky overflow-x wrapper that fixes wide tables like the
 * 10-column ProviderConfigsTable, and the pager footer). Columns/data/row
 * models stay entirely in feature code — pass in the `table` instance
 * returned by `useReactTable(...)`.
 */
import * as React from 'react';
import { flexRender, type Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../lib/utils.js';

export interface DataTableProps<TData> {
  /** The react-table instance built by the caller (columns/data stay theirs). */
  table: Table<TData>;
  className?: string;
  /** Message rendered in place of rows when the row model is empty. */
  emptyMessage?: React.ReactNode | undefined;
  /** Return true to mark a row as selected (`.adm-tr--selected` styling). */
  isRowSelected?: ((row: TData) => boolean) | undefined;
  /** Set to false to hide the `.adm-tablefoot` pager (e.g. small static tables). */
  showPager?: boolean | undefined;
}

export function DataTable<TData>({
  table,
  className,
  emptyMessage = 'Нет данных',
  isRowSelected,
  showPager = true,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  return (
    <div className={cn('flex flex-col', className)} data-testid="data-table">
      {/* overflow-x wrapper — keeps wide tables (10+ columns) from blowing out the layout */}
      <div className="overflow-x-auto rounded-md border border-border" data-testid="data-table-scroll">
        <table className="w-full border-collapse font-sans text-sm text-foreground">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className="whitespace-nowrap border-b border-border-strong px-3.5 py-3 text-left font-mono text-[11px] font-semibold tracking-[0.1em] text-ink-faint uppercase select-none"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(columnCount, 1)}
                  className="px-3.5 py-6 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = isRowSelected?.(row.original) ?? false;
                return (
                  <tr
                    key={row.id}
                    data-state={selected ? 'selected' : undefined}
                    className={cn(
                      'border-b border-border-paper transition-colors',
                      selected ? 'bg-primary/5' : 'hover:hover-card',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3.5 py-3 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showPager ? (
        <div
          className="flex items-center justify-between gap-4 px-4 py-3"
          data-testid="data-table-pager"
        >
          <span className="font-mono text-xs text-ink-muted">
            Страница {table.getState().pagination.pageIndex + 1} из{' '}
            {Math.max(table.getPageCount(), 1)}
          </span>
          <div className="flex items-center gap-1" role="group" aria-label="Пагинация">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Предыдущая страница"
              className="flex h-ctl-md min-w-ctl-md items-center justify-center rounded-sm border border-transparent font-mono text-[13px] text-ink-muted hover:hover-paper hover:text-foreground focus-visible:focus-ring disabled:disabled-dim"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Следующая страница"
              className="flex h-ctl-md min-w-ctl-md items-center justify-center rounded-sm border border-transparent font-mono text-[13px] text-ink-muted hover:hover-paper hover:text-foreground focus-visible:focus-ring disabled:disabled-dim"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
