import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { EmptyState } from './empty-state.js';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="Нет данных" description="Список пока пуст" />);
    expect(screen.getByText('Нет данных')).toBeInTheDocument();
    expect(screen.getByText('Список пока пуст')).toBeInTheDocument();
  });

  it('renders without description when not provided', () => {
    render(<EmptyState title="Нет данных" />);
    expect(screen.getByText('Нет данных')).toBeInTheDocument();
  });

  it('renders the icon slot when an icon is provided', () => {
    render(<EmptyState title="Пусто" icon={<svg data-testid="empty-icon" />} />);
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });

  it('renders the action slot when provided', () => {
    render(<EmptyState title="Пусто" action={<button>Добавить</button>} />);
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument();
  });
});
