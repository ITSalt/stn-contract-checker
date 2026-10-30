// @vitest-environment jsdom
import '../test-setup.ts';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { LegacyTabs, Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.js';

function Harness({ onValueChange }: { onValueChange?: (v: string) => void }) {
  const [tab, setTab] = useState('sources');
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        setTab(v);
        onValueChange?.(v);
      }}
    >
      <TabsList aria-label="Артикул">
        <TabsTrigger value="sources" badge={5}>
          Исходники
        </TabsTrigger>
        <TabsTrigger value="frames" badge="2/4">
          Кадры
        </TabsTrigger>
        <TabsTrigger value="card" disabled>
          Карточка
        </TabsTrigger>
        <TabsTrigger value="video" badge="нет">
          Видео
        </TabsTrigger>
      </TabsList>
      <TabsContent value="sources">панель исходников</TabsContent>
      <TabsContent value="frames">панель кадров</TabsContent>
      <TabsContent value="video">панель видео</TabsContent>
    </Tabs>
  );
}

describe('Tabs — compound, by value', () => {
  it('renders a tablist with one tab per trigger', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Артикул' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('selects by value, not by position', () => {
    render(<Tabs value="video">
      <TabsList>
        <TabsTrigger value="frames">Кадры</TabsTrigger>
        <TabsTrigger value="video">Видео</TabsTrigger>
      </TabsList>
    </Tabs>);
    expect(screen.getByRole('tab', { name: 'Кадры' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Видео' })).toHaveAttribute('aria-selected', 'true');
  });

  it('click calls onValueChange with the trigger value (a URL-safe string)', () => {
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Кадры/ }));
    expect(onValueChange).toHaveBeenCalledWith('frames');
  });

  it('shows only the selected panel, wired with aria-controls / aria-labelledby', () => {
    render(<Harness />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveTextContent('панель исходников');
    expect(screen.queryByText('панель кадров')).toBeNull();
    const tab = screen.getByRole('tab', { name: /Исходники/ });
    expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
  });

  it('forceMount keeps an inactive panel in the DOM, hidden', () => {
    render(
      <Tabs value="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">pa</TabsContent>
        <TabsContent value="b" forceMount>
          pb
        </TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('pb')).not.toBeVisible();
  });

  it('works uncontrolled with defaultValue', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'B' }));
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true');
  });

  it('does not fire onValueChange for a disabled trigger', () => {
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Карточка' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('renders the counter as a mono sm Badge: 5, 2/4, нет', () => {
    render(<Harness />);
    for (const text of ['5', '2/4', 'нет']) {
      const badge = screen.getByText(text);
      expect(badge.className).toContain('font-mono');
      expect(badge.className).toContain('h-[18px]');
    }
  });

  it('throws a clear error when a part is used outside <Tabs>', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TabsList />)).toThrow(/inside <Tabs>/);
    spy.mockRestore();
  });
});

describe('Tabs — keyboard and roving tabindex', () => {
  it('only the selected trigger is in the tab order', () => {
    render(<Harness />);
    expect(screen.getByRole('tab', { name: /Исходники/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Кадры/ })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tab', { name: /Видео/ })).toHaveAttribute('tabindex', '-1');
  });

  it('ArrowRight / ArrowLeft move focus and selection, skipping disabled tabs and wrapping', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('tab', { name: /Исходники/ }).focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Кадры/ })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Кадры/ })).toHaveAttribute('aria-selected', 'true');
    // roving: the focused tab took the tab stop with it
    expect(screen.getByRole('tab', { name: /Кадры/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Исходники/ })).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{ArrowRight}'); // «Карточка» is disabled → Видео
    expect(screen.getByRole('tab', { name: /Видео/ })).toHaveFocus();

    await user.keyboard('{ArrowRight}'); // wraps
    expect(screen.getByRole('tab', { name: /Исходники/ })).toHaveFocus();

    await user.keyboard('{ArrowLeft}'); // wraps back
    expect(screen.getByRole('tab', { name: /Видео/ })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Видео/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('Home and End jump to the first and last enabled tab', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('tab', { name: /Кадры/ }).focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /Видео/ })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: /Исходники/ })).toHaveFocus();
  });

  it('Tab leaves the tablist for the panel instead of walking the other triggers', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('tab', { name: /Исходники/ }).focus();
    await user.tab();
    expect(screen.getByRole('tabpanel')).toHaveFocus();
  });
});

describe('LegacyTabs (deprecated index API)', () => {
  const tabs = [{ label: 'Обзор' }, { label: 'История' }];

  it('renders one tab button per item with tablist role', () => {
    render(<LegacyTabs tabs={tabs} activeIndex={0} onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('marks the active tab with aria-selected=true', () => {
    render(<LegacyTabs tabs={tabs} activeIndex={1} onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Обзор' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'История' })).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onChange with the clicked tab index', () => {
    const onChange = vi.fn();
    render(<LegacyTabs tabs={tabs} activeIndex={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'История' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('does not fire onChange for a disabled tab', () => {
    const onChange = vi.fn();
    render(
      <LegacyTabs
        tabs={[{ label: 'Обзор' }, { label: 'Заблокировано', disabled: true }]}
        activeIndex={0}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Заблокировано' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders a badge next to the tab label when provided', () => {
    render(<LegacyTabs tabs={[{ label: 'Задачи', badge: 5 }]} activeIndex={0} onChange={() => {}} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('Tabs — tab stop when no trigger matches value', () => {
  it.each([undefined, 'unknown'])('value %j: the first enabled trigger takes the tab stop', (value) => {
    render(
      <Tabs {...(value !== undefined ? { value } : {})}>
        <TabsList>
          <TabsTrigger value="a" disabled>
            A
          </TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'C' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('tabindex', '-1');
  });

  it('a matching value keeps the stop on the selected trigger only', () => {
    render(
      <Tabs value="c">
        <TabsList>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tab', { name: 'C' })).toHaveAttribute('tabindex', '0');
  });
});
