// @vitest-environment jsdom
import '../test-setup.ts';
/**
 * Unit tests for the data primitives:
 * DataTable, DescriptionList.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { DataTable } from './data-table.js';
import { DescriptionList } from './description-list.js';

interface Row {
  id: string;
  name: string;
}

const columnHelper = createColumnHelper<Row>();
const columns = [
  columnHelper.accessor('id', { header: 'ID', cell: (info) => info.getValue() }),
  columnHelper.accessor('name', { header: 'Name', cell: (info) => info.getValue() }),
];

function TestTable({ data, isRowSelected }: { data: Row[]; isRowSelected?: (row: Row) => boolean }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return <DataTable table={table} isRowSelected={isRowSelected} />;
}

// Wide table: 12 columns to exercise the overflow-x wrapper.
const wideColumnHelper = createColumnHelper<Record<string, string>>();
const wideColumns = Array.from({ length: 12 }, (_, i) =>
  wideColumnHelper.accessor(`col${i}`, { header: `Col ${i}`, cell: (info) => info.getValue() }),
);

function WideTable() {
  const data = [
    Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`col${i}`, `v${i}`])),
  ];
  const table = useReactTable({
    data,
    columns: wideColumns,
    getCoreRowModel: getCoreRowModel(),
  });
  return <DataTable table={table} />;
}

describe('DataTable', () => {
  it('renders header row with mono uppercase styling and body rows from the row model', () => {
    render(<TestTable data={[{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }]} />);

    const headerCell = screen.getByRole('columnheader', { name: 'ID' });
    expect(headerCell.className).toContain('uppercase');
    expect(headerCell.className).toContain('font-mono');

    expect(screen.getByText('Alpha')).not.toBeNull();
    expect(screen.getByText('Beta')).not.toBeNull();
  });

  it('renders the empty message when the row model has no rows', () => {
    render(<TestTable data={[]} />);
    expect(screen.getByText('Нет данных')).not.toBeNull();
  });

  it('marks a row as selected via isRowSelected and applies the selected background', () => {
    render(
      <TestTable
        data={[{ id: '1', name: 'Alpha' }]}
        isRowSelected={(row) => row.id === '1'}
      />,
    );
    const row = screen.getByText('Alpha').closest('tr')!;
    expect(row.getAttribute('data-state')).toBe('selected');
    expect(row.className).toContain('bg-primary/5');
  });

  it('applies hover styling to non-selected rows', () => {
    render(<TestTable data={[{ id: '1', name: 'Alpha' }]} />);
    const row = screen.getByText('Alpha').closest('tr')!;
    expect(row.getAttribute('data-state')).toBeNull();
    expect(row.className).toContain('hover:hover-card');
  });

  it('wraps the table in an overflow-x container so wide tables clip instead of breaking layout', () => {
    render(<WideTable />);
    const scroll = screen.getByTestId('data-table-scroll');
    expect(scroll.className).toContain('overflow-x-auto');
    expect(scroll.querySelector('table')).not.toBeNull();
    expect(screen.getAllByRole('columnheader')).toHaveLength(12);
  });

  it('renders a pager footer with page info and prev/next controls', () => {
    render(<TestTable data={[{ id: '1', name: 'Alpha' }]} />);
    const pager = screen.getByTestId('data-table-pager');
    expect(within(pager).getByText(/Страница 1 из/)).not.toBeNull();
    expect(within(pager).getByRole('button', { name: 'Предыдущая страница' })).toBeDisabled();
    expect(within(pager).getByRole('button', { name: 'Следующая страница' })).not.toBeNull();
  });

  it('hides the pager when showPager is false', () => {
    function NoPagerTable() {
      const table = useReactTable({
        data: [{ id: '1', name: 'Alpha' }],
        columns,
        getCoreRowModel: getCoreRowModel(),
      });
      return <DataTable table={table} showPager={false} />;
    }
    render(<NoPagerTable />);
    expect(screen.queryByTestId('data-table-pager')).toBeNull();
  });
});

describe('DescriptionList', () => {
  it('renders each term/value pair as dt/dd', () => {
    render(
      <DescriptionList
        items={[
          { term: 'Статус', value: 'Готово' },
          { term: 'Создано', value: '23.07.2026' },
        ]}
      />,
    );
    expect(screen.getByText('Статус')).not.toBeNull();
    expect(screen.getByText('Готово')).not.toBeNull();
    expect(screen.getByText('Создано')).not.toBeNull();
    expect(screen.getByText('23.07.2026')).not.toBeNull();
  });

  it('renders as a definition list for a11y', () => {
    const { container } = render(<DescriptionList items={[{ term: 'A', value: 'B' }]} />);
    expect(container.querySelector('dl')).not.toBeNull();
    expect(container.querySelector('dt')).not.toBeNull();
    expect(container.querySelector('dd')).not.toBeNull();
  });
});
