/**
 * Dialog core: portal, layer stack, focus trap, scroll lock.
 *
 * Acceptance:
 *  1. A nested Dialog over Dialog is higher by z and takes focus; Escape closes
 *     only the top one; focus then returns to the trigger.
 *  2. While a dialog is open, the page's own Escape handler does not fire —
 *     not even in the keystroke that closes the last dialog.
 */
import * as React from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useEscapeOutsideDialogs, useTopmostDialog } from '../lib/use-dialog-depth.js';

import { Button } from './button.js';
import { Dialog, DialogBody, DialogFooter, DialogHeader } from './dialog.js';

function zOf(el: HTMLElement): number {
  // `calc(var(--z-overlay, 100) + N)` — the depth term is what orders layers.
  const layer = el.closest<HTMLElement>('[data-dialog-depth]');
  const m = /\+\s*(\d+)\)/.exec(layer?.style.zIndex ?? '');
  if (!m) throw new Error(`no z-index on layer: "${layer?.style.zIndex}"`);
  return Number(m[1]);
}

function pressEscape(target: Element | Document = document.activeElement ?? document) {
  fireEvent.keyDown(target, { key: 'Escape' });
}

afterEach(() => {
  document.body.style.overflow = '';
});

/** Library page → 980 window → 860 picker → confirm, as in the wave-1 design. */
function Stack({ onPageEscape = () => {} }: { onPageEscape?: () => void }) {
  const [win, setWin] = React.useState(false);
  const [picker, setPicker] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  useEscapeOutsideDialogs(onPageEscape);
  const { count } = useTopmostDialog();
  return (
    <div>
      <span data-testid="open-count">{count}</span>
      <button onClick={() => setWin(true)}>Новый артикул</button>
      <Dialog open={win} onOpenChange={setWin} size="2xl" data-testid="win">
        <DialogHeader title="Новый артикул" />
        <DialogBody>
          <button onClick={() => setPicker(true)}>Выбрать аватар</button>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setConfirm(true)}>Удалить черновик</Button>
        </DialogFooter>
        <Dialog open={picker} onOpenChange={setPicker} size="xl" data-testid="picker">
          <DialogHeader title="Аватар" />
          <DialogBody>
            <input aria-label="Поиск аватара" />
          </DialogBody>
        </Dialog>
        <Dialog open={confirm} onOpenChange={setConfirm} size="sm" data-testid="confirm">
          <DialogHeader title="Удалить черновик?" />
          <DialogFooter>
            <Button onClick={() => setConfirm(false)}>Отмена</Button>
            <Button onClick={() => setConfirm(false)}>Удалить</Button>
          </DialogFooter>
        </Dialog>
      </Dialog>
    </div>
  );
}

describe('Dialog core — nesting (nesting)', () => {
  it('A nested confirm Dialog opened from a Dialog is above it, takes focus, Escape closes only it, focus returns', async () => {
    const user = userEvent.setup();
    render(<Stack />);
    await user.click(screen.getByRole('button', { name: 'Новый артикул' }));
    const win = screen.getByTestId('win');
    const trigger = within(win).getByRole('button', { name: 'Удалить черновик' });
    await user.click(trigger);

    const confirm = screen.getByTestId('confirm');
    expect(zOf(confirm)).toBeGreaterThan(zOf(win));
    // danger tone → focus starts on «Отмена», inside the confirm, not in the window
    expect(confirm).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).toHaveTextContent('Отмена');

    pressEscape();
    expect(screen.queryByTestId('confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('win')).toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape closes the stack one layer per keystroke: picker → window', async () => {
    const user = userEvent.setup();
    render(<Stack />);
    await user.click(screen.getByRole('button', { name: 'Новый артикул' }));
    await user.click(screen.getByRole('button', { name: 'Выбрать аватар' }));
    expect(screen.getByTestId('open-count')).toHaveTextContent('2');
    expect(zOf(screen.getByTestId('picker'))).toBeGreaterThan(zOf(screen.getByTestId('win')));

    pressEscape();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('win')).toBeInTheDocument();
    expect(document.activeElement).toHaveTextContent('Выбрать аватар');

    pressEscape();
    expect(screen.queryByTestId('win')).not.toBeInTheDocument();
    expect(screen.getByTestId('open-count')).toHaveTextContent('0');
  });

  it('overlay click closes only the topmost dialog', async () => {
    const user = userEvent.setup();
    render(<Stack />);
    await user.click(screen.getByRole('button', { name: 'Новый артикул' }));
    await user.click(screen.getByRole('button', { name: 'Выбрать аватар' }));
    const overlays = screen.getAllByTestId('dialog-overlay');
    expect(overlays).toHaveLength(2);
    await user.click(overlays[1] as HTMLElement);
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('win')).toBeInTheDocument();
  });

  it('a nested dialog that opens in the same commit as its parent is still above it', () => {
    render(
      <Dialog open onOpenChange={() => {}} data-testid="outer">
        <DialogHeader title="Внешнее" />
        <Dialog open onOpenChange={() => {}} data-testid="inner">
          <DialogHeader title="Внутреннее" />
        </Dialog>
      </Dialog>,
    );
    expect(zOf(screen.getByTestId('inner'))).toBeGreaterThan(zOf(screen.getByTestId('outer')));
  });

  it('a later sibling dialog (not nested in the tree) is above the earlier one and owns Escape', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <>
        <Dialog open onOpenChange={first} data-testid="a">
          <DialogHeader title="A" />
        </Dialog>
        <Dialog open={false} onOpenChange={second} data-testid="b">
          <DialogHeader title="B" />
        </Dialog>
      </>,
    );
    rerender(
      <>
        <Dialog open onOpenChange={first} data-testid="a">
          <DialogHeader title="A" />
        </Dialog>
        <Dialog open onOpenChange={second} data-testid="b">
          <DialogHeader title="B" />
        </Dialog>
      </>,
    );
    expect(zOf(screen.getByTestId('b'))).toBeGreaterThan(zOf(screen.getByTestId('a')));
    pressEscape(document);
    expect(second).toHaveBeenCalledWith(false);
    expect(first).not.toHaveBeenCalled();
  });

  it('a busy top dialog swallows Escape — it does not fall through to the dialog below', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <Dialog open onOpenChange={outer}>
        <DialogHeader title="Внешнее" />
        <Dialog open onOpenChange={inner} busy>
          <DialogHeader title="Внутреннее" />
        </Dialog>
      </Dialog>,
    );
    pressEscape(document);
    expect(inner).not.toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalled();
  });
});

describe('Dialog core — page Escape (page Escape)', () => {
  it('the page Escape handler does not fire while a dialog is open, nor on the keystroke that closes it', async () => {
    const user = userEvent.setup();
    const onPageEscape = vi.fn();
    render(<Stack onPageEscape={onPageEscape} />);

    await user.click(screen.getByRole('button', { name: 'Новый артикул' }));
    await user.click(screen.getByRole('button', { name: 'Выбрать аватар' }));
    pressEscape(); // closes the picker
    pressEscape(); // closes the window — the last dialog
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onPageEscape).not.toHaveBeenCalled();

    pressEscape(); // nothing open — now it is the page's
    expect(onPageEscape).toHaveBeenCalledTimes(1);
  });

  it('the page handler skips the closing keystroke even when the dialog unmounts before it runs', () => {
    // In a browser React may flush the close between two native listeners of
    // the same keydown; flushSync reproduces that: the stack is already empty
    // when the page listener runs, so only the "consumed" mark protects it.
    const onPageEscape = vi.fn();
    function Page() {
      const [open, setOpen] = React.useState(true);
      useEscapeOutsideDialogs(onPageEscape);
      return (
        <Dialog open={open} onOpenChange={(v) => flushSync(() => setOpen(v))}>
          <DialogHeader title="Окно" />
        </Dialog>
      );
    }
    render(<Page />);
    pressEscape(document);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onPageEscape).not.toHaveBeenCalled();
    pressEscape(document);
    expect(onPageEscape).toHaveBeenCalledTimes(1);
  });

  it('useTopmostDialog reports open layers', async () => {
    const user = userEvent.setup();
    render(<Stack />);
    expect(screen.getByTestId('open-count')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: 'Новый артикул' }));
    expect(screen.getByTestId('open-count')).toHaveTextContent('1');
  });
});

describe('Dialog core — behaviour', () => {
  it('portals into document.body, outside the render container', () => {
    const { container } = render(
      <Dialog open onOpenChange={() => {}}>
        <DialogHeader title="Портал" />
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
  });

  it('wires aria-modal, aria-labelledby → title and aria-describedby → description', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogHeader title="Новый артикул" meta="SKU · 0482" description="Заполните поля" />
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Новый артикул' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Заполните поля');
    expect(screen.getByRole('heading', { name: 'Новый артикул' }).className).toContain('it-h4');
  });

  it('has no aria-describedby without a description', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogHeader title="Без описания" />
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby');
  });

  it.each([
    ['sm', 'max-w-[448px]'],
    ['md', 'max-w-[520px]'],
    ['lg', 'max-w-[720px]'],
    ['xl', 'max-w-[860px]'],
    ['2xl', 'max-w-[980px]'],
  ] as const)('center size %s → %s', (size, cls) => {
    render(
      <Dialog open onOpenChange={() => {}} size={size}>
        <DialogHeader title="Размер" />
      </Dialog>,
    );
    expect(screen.getByRole('dialog').className).toContain(cls);
  });

  it('side placement: full height, no radius, close button by default', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} placement="side" size="lg">
        <DialogHeader title="Профиль" />
        <DialogBody>Тело</DialogBody>
      </Dialog>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('h-dvh');
    expect(panel.className).toContain('max-w-[640px]');
    expect(panel.className).not.toContain('rounded-lg');
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('center placement has no close button unless asked', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogHeader title="Центр" />
      </Dialog>,
    );
    expect(screen.queryByRole('button', { name: 'Закрыть' })).not.toBeInTheDocument();
  });

  it('busy blocks Escape, overlay click and the close button', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} busy>
        <DialogHeader title="Сохранение" closeButton />
      </Dialog>,
    );
    pressEscape(document);
    fireEvent.click(screen.getByTestId('dialog-overlay'));
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeDisabled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('dismissible={false} blocks the overlay click but not Escape', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} dismissible={false}>
        <DialogHeader title="Важно" />
      </Dialog>,
    );
    fireEvent.click(screen.getByTestId('dialog-overlay'));
    expect(onOpenChange).not.toHaveBeenCalled();
    pressEscape(document);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('initial focus: first focusable in Body/Footer, not the header close button', () => {
    render(
      <Dialog open onOpenChange={() => {}} placement="side">
        <DialogHeader title="Фокус" />
        <DialogBody>
          <input aria-label="Название" />
        </DialogBody>
      </Dialog>,
    );
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Название' }));
  });

  it('initialFocus wins; an autoFocus field inside is left alone', () => {
    function WithRef() {
      const ref = React.useRef<HTMLButtonElement>(null);
      return (
        <Dialog open onOpenChange={() => {}} initialFocus={ref}>
          <DialogHeader title="Фокус" />
          <DialogBody>
            <input aria-label="Первое" />
          </DialogBody>
          <DialogFooter>
            <button ref={ref}>Готово</button>
          </DialogFooter>
        </Dialog>
      );
    }
    const { unmount } = render(<WithRef />);
    expect(document.activeElement).toHaveTextContent('Готово');
    unmount();

    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogHeader title="Фокус" />
        <DialogBody>
          <input aria-label="Первое" />
          <input aria-label="Второе" autoFocus />
        </DialogBody>
      </Dialog>,
    );
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Второе' }));
  });

  it('Tab and Shift+Tab wrap inside the topmost dialog', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Снаружи</button>
        <Dialog open onOpenChange={() => {}}>
          <DialogHeader title="Трап" />
          <DialogBody>
            <input aria-label="Первое" />
          </DialogBody>
          <DialogFooter>
            <button>Последняя</button>
          </DialogFooter>
        </Dialog>
      </>,
    );
    const first = screen.getByRole('textbox', { name: 'Первое' });
    const last = screen.getByRole('button', { name: 'Последняя' });
    expect(document.activeElement).toBe(first);
    await user.tab();
    expect(document.activeElement).toBe(last);
    await user.tab();
    expect(document.activeElement).toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it('locks body scroll while any dialog is open and restores the previous value after the last one', () => {
    document.body.style.overflow = 'scroll';
    function Two({ outer, inner }: { outer: boolean; inner: boolean }) {
      return (
        <Dialog open={outer} onOpenChange={() => {}}>
          <DialogHeader title="Внешнее" />
          <Dialog open={inner} onOpenChange={() => {}}>
            <DialogHeader title="Внутреннее" />
          </Dialog>
        </Dialog>
      );
    }
    const { rerender } = render(<Two outer inner />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Two outer inner={false} />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Two outer={false} inner={false} />);
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogHeader title="Закрыт" />
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses the motion-safe variant on overlay and panel', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogHeader title="Движение" />
      </Dialog>,
    );
    expect(screen.getByRole('dialog').className).toMatch(/motion-safe:transition-/);
    expect(screen.getByTestId('dialog-overlay').className).toMatch(/motion-safe:transition-/);
  });
});

describe('Dialog core — nested focus trap', () => {
  function Nested() {
    const [inner, setInner] = React.useState(false);
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogHeader title="Окно" />
        <DialogBody>
          <button onClick={() => setInner(true)}>Окно: первая</button>
        </DialogBody>
        <DialogFooter>
          <button>Окно: последняя</button>
        </DialogFooter>
        <Dialog open={inner} onOpenChange={setInner} size="sm">
          <DialogHeader title="Вложенное" />
          <DialogBody>
            <button>Вложенное: первая</button>
          </DialogBody>
          <DialogFooter>
            <button>Вложенное: последняя</button>
          </DialogFooter>
        </Dialog>
      </Dialog>
    );
  }

  it('only the topmost window traps Tab: Tab / Shift+Tab wrap inside the nested one, the parent does not pull focus back', async () => {
    const user = userEvent.setup();
    render(<Nested />);
    await user.click(screen.getByRole('button', { name: 'Окно: первая' }));
    const first = screen.getByRole('button', { name: 'Вложенное: первая' });
    const last = screen.getByRole('button', { name: 'Вложенное: последняя' });
    expect(document.activeElement).toBe(first);

    await user.tab();
    expect(document.activeElement).toBe(last);
    await user.tab(); // wraps within the NESTED window, not into the parent
    expect(document.activeElement).toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
    // the parent's own buttons were never reached
    expect(screen.getByRole('button', { name: 'Окно: первая', hidden: true })).not.toHaveFocus();
  });
});
