/**
 * Focus trap for dialog panels.
 *
 * - On activation: focus `initialFocus`, else the first focusable element
 *   inside `[data-dialog-autofocus-scope]` (DialogBody / DialogFooter), else
 *   the first focusable in the container, else the container itself
 *   (it needs `tabIndex={-1}`). Focus that is already inside the container
 *   (an `autoFocus` field) is left alone.
 * - Tab / Shift+Tab wrap inside the container while `active`. Only the
 *   topmost dialog is active: a nested dialog is portaled outside its
 *   parent's panel, and the parent must not pull focus back.
 * - On unmount: focus returns to the element that was focused before the
 *   trap mounted (normally the trigger).
 */
import * as React from 'react';

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not(:disabled)',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'iframe',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export interface FocusTrapOptions {
  /** Tab wrapping is enforced only while true (the topmost dialog). */
  active: boolean;
  initialFocus?: React.RefObject<HTMLElement | null> | undefined;
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  { active, initialFocus }: FocusTrapOptions,
) {
  // Captured during the first render, before an `autoFocus` child takes focus.
  const [returnTo] = React.useState(() =>
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null),
  );

  // Initial focus + focus return — once per mount of the panel.
  React.useEffect(() => {
    const container = containerRef.current;
    if (container && !container.contains(document.activeElement)) {
      const scoped = Array.from(
        container.querySelectorAll<HTMLElement>('[data-dialog-autofocus-scope]'),
      ).flatMap(getFocusable);
      const target = initialFocus?.current ?? scoped[0] ?? getFocusable(container)[0] ?? container;
      target.focus({ preventScroll: true });
    }
    return () => {
      if (returnTo && returnTo.isConnected) returnTo.focus?.();
    };
    // Mount/unmount only: re-running would steal focus back on every render.
  }, []);

  React.useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;
      const focusables = getFocusable(container);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (!first || !last) {
        e.preventDefault();
        container.focus();
        return;
      }
      const outside = !current || !container.contains(current);
      if (e.shiftKey && (outside || current === first || current === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (outside || current === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, containerRef]);
}
