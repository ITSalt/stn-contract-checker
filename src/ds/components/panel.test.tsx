// @vitest-environment jsdom
import '../test-setup.ts';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Panel, PanelHeader, PanelBody, PanelFooter } from './panel.js';

describe('Panel', () => {
  it('renders head/body/foot content', () => {
    render(
      <Panel>
        <PanelHeader>Header content</PanelHeader>
        <PanelBody>Body content</PanelBody>
        <PanelFooter>Footer content</PanelFooter>
      </Panel>,
    );

    expect(screen.getByText('Header content')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('applies card surface + border classes to the root', () => {
    const { container } = render(<Panel data-testid="panel">content</Panel>);
    const panel = container.firstChild as HTMLElement;

    expect(panel.className).toContain('bg-card');
    expect(panel.className).toContain('border-border');
  });

  it('renders default body with padding', () => {
    render(<PanelBody data-testid="body">content</PanelBody>);
    expect(screen.getByTestId('body').className).toContain('p-6');
  });

  it('renders flush body variant with no padding', () => {
    render(
      <PanelBody flush data-testid="body">
        content
      </PanelBody>,
    );
    const body = screen.getByTestId('body');
    expect(body.className).toContain('p-0');
    expect(body.className).not.toContain('p-6');
  });

  it('forwards custom className without dropping base classes', () => {
    render(<Panel className="my-extra-class">content</Panel>);
    const panel = screen.getByText('content');
    expect(panel.className).toContain('my-extra-class');
    expect(panel.className).toContain('bg-card');
  });
});
