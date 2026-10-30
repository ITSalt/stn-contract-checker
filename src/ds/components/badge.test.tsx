/**
 * Badge primitive tests.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Badge, badgeVariants, type BadgeTone } from './badge.js';

const ALL_TONES: BadgeTone[] = ['neutral', 'success', 'warning', 'danger', 'info', 'accent'];

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>В работе</Badge>);
    expect(screen.getByText('В работе')).toBeInTheDocument();
  });

  it('defaults to the neutral tone', () => {
    render(<Badge data-testid="badge">Neutral</Badge>);
    expect(screen.getByTestId('badge').className).toContain('bg-tone-neutral-bg');
  });

  it.each(ALL_TONES)('renders the %s tone with pill/uppercase base styles', (tone) => {
    render(
      <Badge data-testid={`badge-${tone}`} tone={tone}>
        {tone}
      </Badge>,
    );
    const el = screen.getByTestId(`badge-${tone}`);
    expect(el.className).toContain('rounded-full');
    expect(el.className).toContain('uppercase');
  });

  it.each(ALL_TONES)('applies the %s tone-table fill and text colour', (tone) => {
    render(
      <Badge data-testid={`tone-${tone}`} tone={tone}>
        {tone}
      </Badge>,
    );
    const cls = screen.getByTestId(`tone-${tone}`).className;
    expect(cls).toContain(`bg-tone-${tone}-bg`);
    expect(cls).toContain(`text-tone-${tone}-fg`);
  });

  it('renders an optional leading dot', () => {
    render(
      <Badge data-testid="badge-dot" tone="danger" dot>
        Ошибка
      </Badge>,
    );
    const el = screen.getByTestId('badge-dot');
    expect(el.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('omits the dot by default', () => {
    render(<Badge data-testid="badge-no-dot">Ok</Badge>);
    expect(screen.getByTestId('badge-no-dot').querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('forwards a11y attributes (role/aria-label) to the rendered span', () => {
    render(
      <Badge role="status" aria-label="Статус задачи: Завершена" tone="success">
        Завершена
      </Badge>,
    );
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-label', 'Статус задачи: Завершена');
  });

  it('merges a caller-supplied className with the variant classes', () => {
    render(
      <Badge data-testid="badge-extra" className="ml-2">
        X
      </Badge>,
    );
    expect(screen.getByTestId('badge-extra').className).toContain('ml-2');
  });

  it('badgeVariants exposes every DS tone', () => {
    for (const tone of ALL_TONES) {
      expect(badgeVariants({ tone })).toContain('rounded-full');
    }
  });
});

describe('Badge — mono / size / variant / icon / dashed (PR 9)', () => {
  it('md is 22px / 11px by default, sm is 18px / 10px', () => {
    render(
      <>
        <Badge data-testid="md">a</Badge>
        <Badge data-testid="sm" size="sm">
          b
        </Badge>
      </>,
    );
    expect(screen.getByTestId('md').className).toContain('h-ctl-xs');
    expect(screen.getByTestId('md').className).toContain('text-[11px]');
    expect(screen.getByTestId('sm').className).toContain('h-[18px]');
    expect(screen.getByTestId('sm').className).toContain('text-[10px]');
  });

  it('mono drops uppercase and tracking, switches to the mono family', () => {
    render(
      <>
        <Badge data-testid="plain">a</Badge>
        <Badge data-testid="mono" mono>
          5
        </Badge>
      </>,
    );
    expect(screen.getByTestId('plain').className).toContain('uppercase');
    const mono = screen.getByTestId('mono').className;
    expect(mono).toContain('font-mono');
    expect(mono).not.toContain('uppercase');
  });

  it.each(ALL_TONES)('solid %s is filled with the fg colour', (tone) => {
    render(
      <Badge data-testid="b" tone={tone} variant="solid">
        x
      </Badge>,
    );
    const cls = screen.getByTestId('b').className;
    expect(cls).toContain(tone === 'accent' ? 'bg-tone-accent-bg' : `bg-tone-${tone}-fg`);
  });

  it.each(ALL_TONES)('outline %s has a border and no fill', (tone) => {
    render(
      <Badge data-testid="b" tone={tone} variant="outline">
        x
      </Badge>,
    );
    const cls = screen.getByTestId('b').className;
    expect(cls).toContain('bg-transparent');
    expect(cls).toContain('border');
    expect(cls).not.toMatch(/\bbg-tone-/);
  });

  it('dashed adds a dashed border', () => {
    render(
      <Badge data-testid="b" dashed>
        x
      </Badge>,
    );
    expect(screen.getByTestId('b').className).toContain('border-dashed');
  });

  it('renders a leading icon before the label', () => {
    render(
      <Badge data-testid="b" icon={<svg data-testid="ico" />}>
        Только чтение
      </Badge>,
    );
    const el = screen.getByTestId('b');
    expect(el.firstElementChild).toBe(screen.getByTestId('ico'));
  });
});

describe('Badge — border assertions', () => {
  it('outline neutral draws its border in the neutral fg tone (not currentColor)', () => {
    render(
      <Badge data-testid="b" variant="outline">
        x
      </Badge>,
    );
    expect(screen.getByTestId('b').className).toContain('border-tone-neutral-fg/30');
  });

  it('dashed uses the hairline border colour, not currentColor', () => {
    render(
      <Badge data-testid="b" dashed>
        x
      </Badge>,
    );
    const cls = screen.getByTestId('b').className;
    expect(cls).toContain('border-dashed');
    expect(cls).toContain('border-border');
  });
});
