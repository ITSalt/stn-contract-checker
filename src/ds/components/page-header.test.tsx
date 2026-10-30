import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PageHeader } from './page-header.js';

describe('PageHeader', () => {
  it('renders the title as an it-h2 heading', () => {
    render(<PageHeader title="Пользователи" />);
    const title = screen.getByRole('heading', { level: 1, name: 'Пользователи' });
    expect(title.className).toContain('it-h2');
  });

  it('renders the orange it-rule bar under the title by default', () => {
    const { container } = render(<PageHeader title="Отчёты" />);
    expect(container.querySelector('.it-rule')).not.toBeNull();
  });

  it('renders right-aligned actions slot', () => {
    render(<PageHeader title="Отчёты" actions={<button>Экспорт</button>} />);
    expect(screen.getByRole('button', { name: 'Экспорт' })).toBeInTheDocument();
  });

  it('does not render an it-rule bar when rule is false', () => {
    const { container } = render(<PageHeader title="Отчёты" rule={false} />);
    expect(container.querySelector('.it-rule')).toBeNull();
  });

  it('renders an eyebrow label above the title when provided', () => {
    render(<PageHeader eyebrow="Работа" title="Сессии" />);
    const eyebrow = screen.getByText('Работа');
    expect(eyebrow.className).toContain('it-eyebrow');
  });

  it('does not render an eyebrow element when omitted', () => {
    render(<PageHeader title="Сессии" />);
    expect(screen.queryByText('Работа')).not.toBeInTheDocument();
  });

  it('renders a description paragraph when provided', () => {
    render(<PageHeader title="Сессии" description="Список всех сессий пользователя" />);
    expect(screen.getByText('Список всех сессий пользователя')).toBeInTheDocument();
  });

  it('does not render a description paragraph when omitted', () => {
    const { container } = render(<PageHeader title="Сессии" />);
    expect(container.querySelector('[data-slot="page-header-description"]')).toBeNull();
  });

  it('accepts a ReactNode title (e.g. name + mono id)', () => {
    render(
      <PageHeader
        title={
          <>
            Сессия <span className="it-mono">SES-042</span>
          </>
        }
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Сессия SES-042');
    expect(screen.getByText('SES-042')).toBeInTheDocument();
  });
});
