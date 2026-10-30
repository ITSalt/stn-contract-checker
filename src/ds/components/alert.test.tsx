// @vitest-environment jsdom
import '../test-setup.ts';
/**
 * Alert primitive tests.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Alert, alertVariants, type AlertTone } from './alert.js';

const ALL_TONES: AlertTone[] = ['info', 'success', 'warning', 'danger'];

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert>Соединение потеряно</Alert>);
    expect(screen.getByText('Соединение потеряно')).toBeInTheDocument();
  });

  it('defaults to the info tone with role="status"', () => {
    render(<Alert data-testid="alert">Инфо</Alert>);
    const el = screen.getByTestId('alert');
    expect(el.className).toContain('bg-tone-info-bg');
    expect(el).toHaveAttribute('role', 'status');
  });

  it.each(ALL_TONES)('renders the %s tone with base recipe styles', (tone) => {
    render(
      <Alert data-testid={`alert-${tone}`} tone={tone}>
        {tone}
      </Alert>,
    );
    const el = screen.getByTestId(`alert-${tone}`);
    expect(el.className).toContain('rounded-sm');
    expect(el.className).toContain('border');
  });

  it('uses role="status" for info and success tones', () => {
    render(
      <Alert data-testid="alert-info" tone="info">
        info
      </Alert>,
    );
    render(
      <Alert data-testid="alert-success" tone="success">
        success
      </Alert>,
    );
    expect(screen.getByTestId('alert-info')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('alert-success')).toHaveAttribute('role', 'status');
  });

  it('uses role="alert" for warning and danger tones', () => {
    render(
      <Alert data-testid="alert-warning" tone="warning">
        warning
      </Alert>,
    );
    render(
      <Alert data-testid="alert-danger" tone="danger">
        danger
      </Alert>,
    );
    expect(screen.getByTestId('alert-warning')).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('alert-danger')).toHaveAttribute('role', 'alert');
  });

  it('allows the caller to override the computed role', () => {
    render(
      <Alert data-testid="alert-override" tone="info" role="alert">
        override
      </Alert>,
    );
    expect(screen.getByTestId('alert-override')).toHaveAttribute('role', 'alert');
  });

  it('renders an optional mono tag', () => {
    render(
      <Alert data-testid="alert-tag" tag="SSE">
        Реконнект
      </Alert>,
    );
    const tag = screen.getByText('SSE');
    expect(tag.className).toContain('uppercase');
    expect(tag.className).toContain('font-mono');
  });

  it('omits the tag by default', () => {
    render(<Alert data-testid="alert-no-tag">Ok</Alert>);
    expect(screen.getByTestId('alert-no-tag').querySelector('[data-slot="alert-tag"]')).toBeNull();
  });

  it('renders an optional action slot', () => {
    render(
      <Alert
        data-testid="alert-action"
        action={<button type="button">Повторить</button>}
      >
        Не удалось загрузить
      </Alert>,
    );
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('forwards a ref to the rendered div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Alert ref={ref}>X</Alert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges a caller-supplied className with the variant classes', () => {
    render(
      <Alert data-testid="alert-extra" className="mb-4">
        X
      </Alert>,
    );
    expect(screen.getByTestId('alert-extra').className).toContain('mb-4');
  });

  it('alertVariants exposes every DS tone', () => {
    for (const tone of ALL_TONES) {
      expect(alertVariants({ tone })).toContain('rounded-sm');
    }
  });
});
