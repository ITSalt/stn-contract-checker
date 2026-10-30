/**
 * Dialog — the one overlay core. Replaces Modal
 * (`placement="center"`), Sheet (`placement="side"`) and AlertDialog
 * (→ ConfirmDialog); the old names stay one release as deprecated aliases.
 *
 * Behaviour, same for every placement:
 * - portal into `document.body` (or `container`);
 * - one layer stack (`lib/use-dialog-depth.ts`): Escape and overlay click
 *   close the topmost dialog only; `z-index = var(--z-overlay) + depth*10`,
 *   so a dialog opened from a dialog is always above it;
 * - focus trap, initial focus (first focusable in Body/Footer or
 *   `initialFocus`), focus return to the trigger, `body` scroll lock;
 * - `busy` blocks Escape, overlay click and the close button;
 *   `dismissible={false}` blocks the overlay click only.
 *
 * Sizes, center (max-width): sm 448 · md 520 · lg 720 · xl 860 · 2xl 980.
 * Side (width): sm 400 · md 480 · lg 640 · xl 860 · 2xl 980.
 * xl/2xl were added for the wave-1 design (980 window over the Library,
 * 860 pickers over it); the spec listed only sm/md/lg.
 *
 * Visual: paper-warm surface (`bg-background`, never white), shadow-lift;
 * center = radius-lg, `max-h-[88vh]`, rise 14px; side = no radius, `h-dvh`,
 * slide. Overlay = graphite scrim, `--motion-fast` fade. `motion-safe:` only.
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';

import { DialogLayerContext, useDialogLayer } from '../lib/use-dialog-depth.js';
import { useFocusTrap } from '../lib/use-focus-trap.js';
import { cn } from '../lib/utils.js';

import { ActionBar, type ActionBarProps } from './action-bar.js';
import { IconButton } from './icon-button.js';

export type DialogPlacement = 'center' | 'side';
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface DialogContextValue {
  titleId: string;
  descriptionId: string;
  described: boolean;
  setDescribed: (v: boolean) => void;
  placement: DialogPlacement;
  busy: boolean;
  isTopmost: boolean;
  requestClose: () => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error(`${component} must be rendered inside <Dialog>`);
  return ctx;
}

// ---------------------------------------------------------------------------
// Internal building blocks — shared by Dialog, ConfirmDialog and the
// deprecated Modal / Sheet / AlertDialog aliases. Not part of the DS API.
// ---------------------------------------------------------------------------

export interface DialogLayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  placement?: DialogPlacement;
  busy?: boolean;
  dismissible?: boolean;
  /** Portal target; default `document.body`. Previews pass a framed stage. */
  container?: HTMLElement | null | undefined;
  /** data-testid of the layer root (wraps overlay + panel). */
  layerTestId?: string | undefined;
  /** data-testid of the overlay. */
  overlayTestId?: string | undefined;
}

/** @internal Portal + stack + overlay + scroll lock; the panel is its child. */
export function DialogLayer({
  open,
  onOpenChange,
  children,
  placement = 'center',
  busy = false,
  dismissible = true,
  container,
  layerTestId,
  overlayTestId = 'dialog-overlay',
}: DialogLayerProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [described, setDescribed] = React.useState(false);
  const requestClose = React.useCallback(() => {
    if (!busy) onOpenChange(false);
  }, [busy, onOpenChange]);
  // A custom container (a framed preview stage) leaves the page scroll alone.
  const layer = useDialogLayer(open, { onEscape: requestClose, lockScroll: !container });

  const ctx = React.useMemo<DialogContextValue>(
    () => ({
      titleId,
      descriptionId,
      described,
      setDescribed,
      placement,
      busy,
      isTopmost: layer.isTopmost,
      requestClose,
    }),
    [titleId, descriptionId, described, placement, busy, layer.isTopmost, requestClose],
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <DialogLayerContext.Provider value={layer.id}>
      <DialogContext.Provider value={ctx}>
        <div
          data-testid={layerTestId}
          data-dialog-depth={layer.depth}
          style={{ zIndex: layer.zIndex }}
          className={cn(
            'fixed inset-0 flex',
            placement === 'center' ? 'items-center justify-center p-6' : 'items-stretch',
          )}
        >
          <div
            data-testid={overlayTestId}
            aria-hidden="true"
            className={cn(
              'absolute inset-0 bg-graphite/44 opacity-100',
              'motion-safe:transition-opacity motion-safe:duration-(--motion-fast) motion-safe:ease-out',
              'motion-safe:starting:opacity-0',
            )}
            onClick={() => {
              if (dismissible) requestClose();
            }}
          />
          {children}
        </div>
      </DialogContext.Provider>
    </DialogLayerContext.Provider>,
    container ?? document.body,
  );
}

const panelVariants = cva(
  [
    'relative flex flex-col bg-background shadow-lift outline-none',
    'opacity-100 motion-safe:transition-[opacity,transform] motion-safe:duration-(--motion-enter)',
    'motion-safe:ease-enter motion-safe:starting:opacity-0',
  ].join(' '),
  {
    variants: {
      placement: {
        center: 'w-full max-h-[88vh] rounded-lg motion-safe:starting:translate-y-[14px]',
        side: 'h-dvh w-full overflow-hidden',
      },
      side: {
        right: '',
        left: '',
      },
      size: { none: '', sm: '', md: '', lg: '', xl: '', '2xl': '' },
    },
    compoundVariants: [
      { placement: 'center', size: 'sm', className: 'max-w-[448px]' },
      { placement: 'center', size: 'md', className: 'max-w-[520px]' },
      { placement: 'center', size: 'lg', className: 'max-w-[720px]' },
      { placement: 'center', size: 'xl', className: 'max-w-[860px]' },
      { placement: 'center', size: '2xl', className: 'max-w-[980px]' },
      { placement: 'side', size: 'sm', className: 'max-w-[400px]' },
      { placement: 'side', size: 'md', className: 'max-w-[480px]' },
      { placement: 'side', size: 'lg', className: 'max-w-[640px]' },
      { placement: 'side', size: 'xl', className: 'max-w-[860px]' },
      { placement: 'side', size: '2xl', className: 'max-w-[980px]' },
      { placement: 'side', side: 'right', className: 'ml-auto motion-safe:starting:translate-x-10' },
      { placement: 'side', side: 'left', className: 'mr-auto motion-safe:starting:-translate-x-10' },
    ],
    defaultVariants: { placement: 'center', side: 'right', size: 'md' },
  },
);

export interface DialogPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  side?: 'right' | 'left';
  /** `null` — no size class (deprecated aliases set the width themselves). */
  size?: DialogSize | null;
  role?: 'dialog' | 'alertdialog';
  initialFocus?: React.RefObject<HTMLElement | null> | undefined;
}

/** @internal The `role="dialog"` panel: focus trap, aria wiring, size. */
export function DialogPanel({
  side = 'right',
  size = 'md',
  role = 'dialog',
  initialFocus,
  className,
  children,
  ...props
}: DialogPanelProps) {
  const ctx = useDialogContext('DialogPanel');
  const ref = React.useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { active: ctx.isTopmost, initialFocus });

  return (
    <div
      ref={ref}
      role={role}
      aria-modal="true"
      aria-labelledby={ctx.titleId}
      aria-describedby={ctx.described ? ctx.descriptionId : undefined}
      tabIndex={-1}
      className={cn(
        panelVariants({ placement: ctx.placement, side, size: size ?? 'none' }),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** @internal Title id / busy / close of the enclosing dialog — for the deprecated aliases. */
export function useDialogInternals() {
  return useDialogContext('Dialog part');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** center = former Modal, side = former Sheet */
  placement?: DialogPlacement;
  /** placement="side" only */
  side?: 'right' | 'left';
  /** center: max-width 448/520/720/860/980; side: width 400/480/640/860/980 */
  size?: DialogSize;
  /** Blocks Escape, overlay click and the close button. */
  busy?: boolean;
  /** Close on overlay click; default true (ConfirmDialog → false). */
  dismissible?: boolean;
  /** Element to focus first; default — first focusable in Body/Footer. */
  initialFocus?: React.RefObject<HTMLElement | null> | undefined;
  /** Portal target; default `document.body`. A custom container skips the body scroll lock. */
  container?: HTMLElement | null | undefined;
  className?: string | undefined;
  'data-testid'?: string | undefined;
}

export function Dialog({
  open,
  onOpenChange,
  children,
  placement = 'center',
  side = 'right',
  size = 'md',
  busy = false,
  dismissible = true,
  initialFocus,
  container,
  className,
  'data-testid': testId,
}: DialogProps) {
  return (
    <DialogLayer
      open={open}
      onOpenChange={onOpenChange}
      placement={placement}
      busy={busy}
      dismissible={dismissible}
      container={container}
    >
      <DialogPanel
        side={side}
        size={size}
        initialFocus={initialFocus}
        className={className}
        data-testid={testId}
      >
        {children}
      </DialogPanel>
    </DialogLayer>
  );
}

export interface DialogHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** `.it-h4` (display 16/700) for every placement. */
  title: React.ReactNode;
  /** `.it-mono text-[11px] text-muted-foreground` */
  meta?: React.ReactNode;
  /** `.it-small text-muted-foreground`, wired to `aria-describedby`. */
  description?: React.ReactNode;
  /** Close button on the right; default true for side, false for center. */
  closeButton?: boolean;
}

export function DialogHeader({
  title,
  meta,
  description,
  closeButton,
  children,
  className,
  ...props
}: DialogHeaderProps) {
  const ctx = useDialogContext('DialogHeader');
  const { setDescribed } = ctx;
  const hasDescription = description !== undefined && description !== null && description !== false;
  React.useLayoutEffect(() => {
    setDescribed(hasDescription);
  }, [hasDescription, setDescribed]);
  const showClose = closeButton ?? ctx.placement === 'side';

  return (
    <div
      className={cn(
        'flex shrink-0 items-start justify-between gap-4 px-6 pt-5',
        ctx.placement === 'side' && 'border-b border-border pb-4',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <h2 id={ctx.titleId} className="it-h4">
          {title}
        </h2>
        {meta ? <div className="it-mono mt-1 text-[11px] text-muted-foreground">{meta}</div> : null}
        {hasDescription ? (
          <p id={ctx.descriptionId} className="it-small mt-1.5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {showClose ? (
        <IconButton
          aria-label="Закрыть"
          size="sm"
          className="shrink-0 border-transparent"
          disabled={ctx.busy}
          onClick={ctx.requestClose}
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      ) : null}
    </div>
  );
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = useDialogContext('DialogBody');
  return (
    <div
      data-dialog-autofocus-scope=""
      className={cn(
        'min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed text-muted-foreground',
        ctx.placement === 'side' ? 'px-6 py-5' : 'px-6 pb-6 pt-4',
        className,
      )}
      {...props}
    />
  );
}

/** = `<ActionBar />` with the dialog padding; never shrinks under a long body. */
export const DialogFooter = React.forwardRef<HTMLDivElement, ActionBarProps>(
  ({ className, ...props }, ref) => (
    <ActionBar ref={ref} data-dialog-autofocus-scope="" className={cn('shrink-0', className)} {...props} />
  ),
);
DialogFooter.displayName = 'DialogFooter';
