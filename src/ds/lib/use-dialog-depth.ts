/**
 * Dialog layer stack — one registry for every open overlay layer (Dialog,
 * ConfirmDialog, the deprecated Modal/Sheet/AlertDialog aliases, ImageViewer).
 *
 * Why one stack and not a listener per dialog: with a `keydown` listener on
 * `document` per overlay, one Escape closed every open overlay at once
 *. Here a single capture-phase listener
 * hands Escape to the topmost layer only.
 *
 * - Order: a layer opened later sits above the ones already open. A nested
 *   layer (rendered inside another layer's React tree) always sits above its
 *   ancestor, even when both open in the same commit — layout effects run
 *   child-first, so the ancestor is inserted below its registered descendants.
 * - z-index: `var(--z-overlay) + depth*10`, `depth` = index in the stack.
 * - Page-level Escape handlers (e.g. a comment block on the page) must not
 *   fire while a layer is open: use `useEscapeOutsideDialogs()` or check
 *   `isEscapeHandledByDialog(event)` / `hasOpenDialogs()` in your own handler.
 * - Non-modal layers (`modal: false`, the Popover): own Escape while topmost, so
 *   the first Escape closes only the popover and the next one the window; the
 *   dialog underneath stays `isTopmost` (its focus trap keeps working).
 * - Scroll lock: `body { overflow: hidden }` while at least one layer that
 *   asks for it is open; the value from before the first lock is restored.
 */
import * as React from 'react';

interface Layer {
  id: number;
  parentId: number | null;
  escape: React.RefObject<(() => void) | null>;
  lockScroll: boolean;
  /** A non-modal layer (Popover) takes Escape but does not deactivate the focus trap below it. */
  modal: boolean;
}

let nextId = 1;
let stack: readonly Layer[] = [];
const subscribers = new Set<() => void>();
/** Escape events consumed by a layer — page handlers that run later skip them. */
const consumedEscapes = new WeakSet<Event>();
let savedBodyOverflow: string | null = null;

function emit() {
  for (const fn of subscribers) fn();
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

function getCount() {
  return stack.length;
}

function isDescendantOf(layer: Layer, ancestorId: number, byId: Map<number, Layer>): boolean {
  let parentId = layer.parentId;
  while (parentId !== null) {
    if (parentId === ancestorId) return true;
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return false;
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || stack.length === 0) return;
  consumedEscapes.add(e);
  // A busy layer keeps the Escape (it must not fall through to the layer below).
  stack[stack.length - 1]?.escape.current?.();
}

function syncSideEffects() {
  if (typeof document === 'undefined') return;
  const locked = stack.some((l) => l.lockScroll);
  if (locked && savedBodyOverflow === null) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else if (!locked && savedBodyOverflow !== null) {
    document.body.style.overflow = savedBodyOverflow;
    savedBodyOverflow = null;
  }
}

function register(layer: Layer) {
  if (stack.length === 0) document.addEventListener('keydown', handleKeyDown, true);
  const byId = new Map(stack.map((l) => [l.id, l]));
  byId.set(layer.id, layer);
  const firstDescendant = stack.findIndex((l) => isDescendantOf(l, layer.id, byId));
  stack =
    firstDescendant === -1
      ? [...stack, layer]
      : [...stack.slice(0, firstDescendant), layer, ...stack.slice(firstDescendant)];
  syncSideEffects();
  emit();
}

function unregister(id: number) {
  stack = stack.filter((l) => l.id !== id);
  if (stack.length === 0) document.removeEventListener('keydown', handleKeyDown, true);
  syncSideEffects();
  emit();
}

/** Id of the nearest enclosing layer — lets a nested dialog know its parent. */
export const DialogLayerContext = React.createContext<number | null>(null);

/** `z-index` of a layer at `depth` (0 = the lowest open layer). */
export function dialogZIndex(depth: number): string {
  return `calc(var(--z-overlay, 100) + ${depth * 10})`;
}

export interface DialogLayerOptions {
  /** Called when Escape is pressed and this layer is the topmost one. */
  onEscape?: () => void;
  /** Lock `body` scroll while open. Default true. */
  lockScroll?: boolean;
  /** Default true. `false` — the layer does not take the focus trap from the one below. */
  modal?: boolean;
}

export interface DialogLayerState {
  /** Stable id — provide it through `DialogLayerContext` to nested layers. */
  id: number;
  /** Index in the open stack; -1 while closed. */
  depth: number;
  isTopmost: boolean;
  /** `z-index` for the layer's root element. */
  zIndex: string;
}

/** Registers an open overlay layer in the stack. */
export function useDialogLayer(open: boolean, options: DialogLayerOptions = {}): DialogLayerState {
  const { onEscape, lockScroll = true, modal = true } = options;
  const parentId = React.useContext(DialogLayerContext);
  const [id] = React.useState(() => nextId++);
  const escape = React.useRef<(() => void) | null>(null);
  escape.current = onEscape ?? null;

  React.useLayoutEffect(() => {
    if (!open) return;
    register({ id, parentId, escape, lockScroll, modal });
    return () => unregister(id);
  }, [open, id, parentId, lockScroll, modal]);

  // Primitive snapshot "depth/size": a closed layer reads "" and does not
  // re-render when other dialogs open or close.
  const getPosition = React.useCallback(() => {
    const depth = stack.findIndex((l) => l.id === id);
    if (depth === -1) return '';
    // "size" = index just past the topmost MODAL layer, so a popover above does not demote this one.
    let top = stack.length - 1;
    while (top > depth && !stack[top]?.modal) top--;
    return `${depth}/${top + 1}`;
  }, [id]);
  const position = React.useSyncExternalStore(subscribe, getPosition, getPosition);
  const [depth, size] = position ? position.split('/').map(Number) : [-1, 0];
  return {
    id,
    depth: depth ?? -1,
    isTopmost: depth !== -1 && depth === (size ?? 0) - 1,
    zIndex: dialogZIndex(Math.max(depth ?? 0, 0)),
  };
}

/** True while at least one dialog layer is open (read at call time, no render lag). */
export function hasOpenDialogs(): boolean {
  return stack.length > 0;
}

/** True when this Escape `keydown` was already handed to an open dialog layer. */
export function isEscapeHandledByDialog(e: Event): boolean {
  return consumedEscapes.has(e);
}

export interface TopmostDialogState {
  /** At least one dialog layer is open. */
  hasOpenDialog: boolean;
  /** Number of open layers. */
  count: number;
}

/** Subscribes a component to the dialog stack: re-renders when a layer opens or closes. */
export function useTopmostDialog(): TopmostDialogState {
  const count = React.useSyncExternalStore(subscribe, getCount, getCount);
  return { hasOpenDialog: count > 0, count };
}

/**
 * Page-level Escape: `handler` runs only when no dialog layer is open and the
 * event was not consumed by one (closing the top dialog with Escape must not
 * also close the page's comment block in the same keystroke).
 */
export function useEscapeOutsideDialogs(handler: (e: KeyboardEvent) => void, enabled = true) {
  const ref = React.useRef(handler);
  ref.current = handler;
  React.useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isEscapeHandledByDialog(e) || hasOpenDialogs()) return;
      ref.current(e);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
