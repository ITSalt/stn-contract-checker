// @vitest-environment jsdom
import '../test-setup.ts';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Button, buttonVariants } from './button.js';

describe('Button variant -> class mapping', () => {
  it('renders the default (primary) variant with the orange shadow + brand background', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.className).toContain('bg-primary');
    expect(btn.className).toContain('shadow-orange');
  });

  it('renders the outline (secondary) variant with card background + border', () => {
    render(<Button variant="outline">Cancel</Button>);
    const btn = screen.getByRole('button', { name: 'Cancel' });
    expect(btn.className).toContain('bg-card');
    expect(btn.className).toContain('border');
  });

  it('renders the ghost variant with transparent background', () => {
    render(<Button variant="ghost">Dismiss</Button>);
    const btn = screen.getByRole('button', { name: 'Dismiss' });
    expect(btn.className).toContain('bg-transparent');
  });

  it('renders the danger variant with the destructive background', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toContain('bg-destructive');
  });

  it('renders the sm size with the compact height', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn.className).toContain('h-ctl-md');
  });

  it('renders the default (md) size with h-ctl-lg', () => {
    render(<Button>Default</Button>);
    const btn = screen.getByRole('button', { name: 'Default' });
    expect(btn.className).toContain('h-ctl-lg');
  });

  it('applies an active-state translateY nudge class', () => {
    render(<Button>Press</Button>);
    const btn = screen.getByRole('button', { name: 'Press' });
    expect(btn.className).toContain('active:translate-y-px');
  });

  it('merges a caller-supplied className without dropping variant classes', () => {
    render(<Button className="w-full">Full width</Button>);
    const btn = screen.getByRole('button', { name: 'Full width' });
    expect(btn.className).toContain('w-full');
    expect(btn.className).toContain('bg-primary');
  });
});

describe('Button sizes on the ctl scale', () => {
  it('maps sm/md/lg to 30/40/48 control tokens and keeps default as md', () => {
    expect(buttonVariants({ size: 'sm' })).toContain('h-ctl-md');
    expect(buttonVariants({ size: 'md' })).toContain('h-ctl-lg');
    expect(buttonVariants({ size: 'lg' })).toContain('h-ctl-xl');
    expect(buttonVariants({ size: 'default' })).toContain('h-ctl-lg');
  });
});

describe('Button disabled / focus', () => {
  it('dims via disabled-dim and uses the shared focus ring', () => {
    const cls = buttonVariants();
    expect(cls).toContain('disabled:disabled-dim');
    expect(cls).toContain('focus-visible:focus-ring');
  });
});
