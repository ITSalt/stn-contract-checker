// @vitest-environment jsdom
import '../test-setup.ts';
/**
 * IconButton primitive tests.
 * square 32px (sm 26px) icon-only control, radius-sm, hairline border,
 * hover → paper-warm. `aria-label` is mandatory (icon-only control).
 */
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IconButton, iconButtonVariants } from './icon-button.js';

describe('IconButton', () => {
  it('renders a native button carrying the required aria-label', () => {
    render(<IconButton aria-label="Закрыть">×</IconButton>);
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
  });

  it('defaults to type="button"', () => {
    render(
      <IconButton aria-label="Закрыть" data-testid="icon-btn">
        ×
      </IconButton>,
    );
    expect(screen.getByTestId('icon-btn')).toHaveAttribute('type', 'button');
  });

  it('applies 30px (md) square classes by default', () => {
    render(
      <IconButton aria-label="Закрыть" data-testid="icon-btn">
        ×
      </IconButton>,
    );
    const el = screen.getByTestId('icon-btn');
    expect(el.className).toContain('h-ctl-md');
    expect(el.className).toContain('w-ctl-md');
  });

  it('applies 26px square classes for size="sm"', () => {
    render(
      <IconButton aria-label="Закрыть" size="sm" data-testid="icon-btn">
        ×
      </IconButton>,
    );
    const el = screen.getByTestId('icon-btn');
    expect(el.className).toContain('h-ctl-sm');
    expect(el.className).toContain('w-ctl-sm');
  });

  it('uses radius-sm and a hairline border', () => {
    render(
      <IconButton aria-label="Закрыть" data-testid="icon-btn">
        ×
      </IconButton>,
    );
    const el = screen.getByTestId('icon-btn');
    expect(el.className).toContain('rounded-sm');
    expect(el.className).toContain('border-border');
  });

  it('hovers to the paper tint utility', () => {
    render(
      <IconButton aria-label="Закрыть" data-testid="icon-btn">
        ×
      </IconButton>,
    );
    expect(screen.getByTestId('icon-btn').className).toContain('hover:hover-paper');
  });

  it('forwards a ref to the underlying button element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <IconButton aria-label="Закрыть" ref={ref}>
        ×
      </IconButton>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('fires onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Закрыть" onClick={onClick}>
        ×
      </IconButton>,
    );
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards native disabled attribute', () => {
    render(
      <IconButton aria-label="Закрыть" disabled data-testid="icon-btn">
        ×
      </IconButton>,
    );
    expect(screen.getByTestId('icon-btn')).toBeDisabled();
  });

  it('merges a caller-supplied className with the variant classes', () => {
    render(
      <IconButton aria-label="Закрыть" className="ml-2" data-testid="icon-btn">
        ×
      </IconButton>,
    );
    expect(screen.getByTestId('icon-btn').className).toContain('ml-2');
  });

  it('does not introduce raw neutral-*/red-* utility classes', () => {
    render(
      <IconButton aria-label="Закрыть" data-testid="icon-btn">
        ×
      </IconButton>,
    );
    const el = screen.getByTestId('icon-btn');
    expect(el.className).not.toMatch(/\bneutral-\d/);
    expect(el.className).not.toMatch(/\bred-\d/);
  });

  it('iconButtonVariants exposes sm/md/lg and the deprecated default alias', () => {
    expect(iconButtonVariants({ size: 'default' })).toContain('h-ctl-md');
    expect(iconButtonVariants({ size: 'sm' })).toContain('h-ctl-sm');
    expect(iconButtonVariants({ size: 'md' })).toContain('h-ctl-md');
    expect(iconButtonVariants({ size: 'lg' })).toContain('h-ctl-lg');
  });
});
