import { describe, it, expect } from 'vitest';

import { cn } from '../lib/utils.js';

import { inputVariants } from './input.js';
import { iconButtonVariants } from './icon-button.js';

describe('inputVariants', () => {
  it('invalid sets the destructive border and a red focus ring colour', () => {
    const cls = inputVariants({ invalid: true });
    expect(cls).toContain('border-destructive');
    expect(cls).toContain('--focus-ring-color:color-mix');
    expect(cls).toContain('var(--color-destructive)');
  });

  it('valid does not carry the red ring', () => {
    expect(inputVariants({ invalid: false })).not.toContain('--focus-ring-color');
  });

  it('does not transition outline-color (no dark flash on focus)', () => {
    expect(inputVariants()).not.toContain('outline-color');
  });
});

describe('cn knows the DS utilities', () => {
  it('a caller h-9 replaces h-ctl-lg', () => {
    const cls = cn(inputVariants(), 'h-9');
    expect(cls).toContain('h-9');
    expect(cls).not.toContain('h-ctl-lg');
  });

  it('w-/size- ctl utilities merge with plain widths', () => {
    expect(cn('w-ctl-md', 'w-8')).toBe('w-8');
    expect(cn('size-8', 'size-ctl-lg')).toBe('size-ctl-lg');
  });

  it('a caller hover:bg-* removes hover:hover-paper', () => {
    const cls = cn(iconButtonVariants(), 'hover:bg-card/10');
    expect(cls).toContain('hover:bg-card/10');
    expect(cls).not.toContain('hover:hover-paper');
  });

  it('hover surfaces do not eat unrelated or non-hover backgrounds', () => {
    const cls = cn('bg-card hover:hover-paper');
    expect(cls).toContain('bg-card');
    expect(cls).toContain('hover:hover-paper');
  });

  it('disabled-dim merges with opacity-*', () => {
    expect(cn('disabled:disabled-dim', 'disabled:opacity-100')).toBe('disabled:opacity-100');
  });
});
