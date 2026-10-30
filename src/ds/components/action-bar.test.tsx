// @vitest-environment jsdom
import '../test-setup.ts';
/**
 * ActionBar, the one footer bar; PanelFooter is a deprecated wrapper over it.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ActionBar } from './action-bar.js';
import { PanelFooter } from './panel.js';

describe('ActionBar', () => {
  it('recipe: flex row, 10px gap, 24px side padding, top hairline, right-aligned', () => {
    render(<ActionBar data-testid="bar">x</ActionBar>);
    const cls = screen.getByTestId('bar').className;
    for (const c of ['flex', 'items-center', 'gap-2.5', 'px-6', 'py-4', 'border-t', 'border-border', 'justify-end']) {
      expect(cls).toContain(c);
    }
  });

  it('divider={false} drops the hairline', () => {
    render(<ActionBar data-testid="bar" divider={false} />);
    expect(screen.getByTestId('bar').className).not.toContain('border-t');
  });

  it('align="between" pushes the first child left; align="start" packs left', () => {
    const { rerender } = render(<ActionBar data-testid="bar" align="between" />);
    expect(screen.getByTestId('bar').className).toContain('[&>:first-child]:mr-auto');
    rerender(<ActionBar data-testid="bar" align="start" />);
    expect(screen.getByTestId('bar').className).toContain('justify-start');
  });

  it('surface="card" = former FormActions; sticky pins to the bottom', () => {
    const { rerender } = render(<ActionBar data-testid="bar" surface="card" />);
    expect(screen.getByTestId('bar').className).toContain('bg-card');
    expect(screen.getByTestId('bar').className).toContain('rounded-b-md');
    rerender(<ActionBar data-testid="bar" sticky />);
    expect(screen.getByTestId('bar').className).toContain('sticky');
    expect(screen.getByTestId('bar').className).toContain('bottom-0');
  });

  it('ActionBar.Spacer pushes the following children right', () => {
    render(
      <ActionBar data-testid="bar">
        <span>Слева</span>
        <ActionBar.Spacer />
        <span>Справа</span>
      </ActionBar>,
    );
    const spacer = screen.getByTestId('bar').children[1] as HTMLElement;
    expect(spacer.className).toBe('mr-auto');
    expect(spacer).toHaveAttribute('aria-hidden', 'true');
  });

  it('a caller className overrides the recipe (twMerge)', () => {
    render(<ActionBar data-testid="bar" className="px-0" />);
    expect(screen.getByTestId('bar').className).not.toContain('px-6');
  });
});

describe('deprecated footers render ActionBar', () => {
  it('PanelFooter = ActionBar', () => {
    render(<PanelFooter data-testid="pf" />);
    expect(screen.getByTestId('pf').className).toContain('gap-2.5');
    expect(screen.getByTestId('pf').className).toContain('border-t');
  });
});
