/**
 * Tabs — compound parts, selection by VALUE:
 *
 *   <Tabs value={tab} onValueChange={setTab}>
 *     <TabsList aria-label="Ветки">
 *       <TabsTrigger value="main" badge={12}>Main</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="main">…</TabsContent>
 *   </Tabs>
 *
 * The value is a string that is safe to put in a URL (`?tab=frames`).
 * Roving tabindex: only the selected trigger is in the tab order; ← → Home End
 * move focus AND selection. Counters render as `<Badge mono size="sm">`.
 */
import * as React from 'react';

import { cn } from '../lib/utils.js';

import { Badge } from './badge.js';

interface TabsContextValue {
  value: string | undefined;
  setValue: (value: string) => void;
  baseId: string;
  /** Value of the trigger that holds the tab stop when none matches `value`. */
  fallbackValue: string | null;
  setFallbackValue: (value: string | null) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(part: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error(`${part} must be used inside <Tabs>`);
  return ctx;
}

/** Ids must survive arbitrary tab values (`?tab=a b`), so they are encoded. */
function partId(baseId: string, kind: 'tab' | 'panel', value: string) {
  return `${baseId}-${kind}-${encodeURIComponent(value)}`;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, defaultValue, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const baseId = React.useId();
  const [fallbackValue, setFallbackValue] = React.useState<string | null>(null);
  const current = value !== undefined ? value : internal;
  const setValue = React.useCallback(
    (next: string) => {
      setInternal(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );
  const ctx = React.useMemo(
    () => ({ value: current, setValue, baseId, fallbackValue, setFallbackValue }),
    [current, setValue, baseId, fallbackValue],
  );
  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, onKeyDown, ...props }, ref) => {
    const { setValue, value, setFallbackValue } = useTabsContext('TabsList');
    const listRef = React.useRef<HTMLDivElement | null>(null);

    // No enabled trigger matches `value` (unset, unknown): the first enabled
    // trigger takes the tab stop, so the group never drops out of the Tab order.
    React.useLayoutEffect(() => {
      const enabled = Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? [],
      );
      const matched = enabled.some((t) => t.dataset['value'] === value);
      setFallbackValue(matched ? null : (enabled[0]?.dataset['value'] ?? null));
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const tabs = Array.from(
        e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
      );
      const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (index === -1) return;
      let next: number;
      switch (e.key) {
        case 'ArrowRight':
          next = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          next = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = tabs.length - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const target = tabs[next];
      const targetValue = target?.dataset['value'];
      if (!target || targetValue === undefined) return;
      target.focus();
      setValue(targetValue);
    };

    return (
      <div
        ref={(node) => {
          listRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        role="tablist"
        className={cn('flex gap-1 border-b border-border', className)}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  /** Counter next to the label, rendered as `<Badge mono size="sm">`. */
  badge?: React.ReactNode;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, badge, children, onClick, disabled, ...props }, ref) => {
    const ctx = useTabsContext('TabsTrigger');
    const selected = ctx.value === value;
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={partId(ctx.baseId, 'tab', value)}
        data-value={value}
        aria-selected={selected}
        aria-controls={partId(ctx.baseId, 'panel', value)}
        tabIndex={selected || ctx.fallbackValue === value ? 0 : -1}
        disabled={disabled}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented && !disabled) ctx.setValue(value);
        }}
        className={cn(
          '-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3.5 py-2.5',
          'font-semibold text-sm text-muted-foreground transition-colors',
          'hover:text-foreground focus-visible:focus-ring disabled:disabled-dim',
          selected && 'border-primary text-foreground',
          className,
        )}
        {...props}
      >
        {children}
        {badge !== undefined && badge !== null && (
          <Badge mono size="sm">
            {badge}
          </Badge>
        )}
      </button>
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  /** Keep the panel mounted (hidden) while another tab is selected. */
  forceMount?: boolean;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, forceMount = false, ...props }, ref) => {
    const ctx = useTabsContext('TabsContent');
    const selected = ctx.value === value;
    if (!selected && !forceMount) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        id={partId(ctx.baseId, 'panel', value)}
        aria-labelledby={partId(ctx.baseId, 'tab', value)}
        hidden={!selected}
        tabIndex={0}
        {...props}
      />
    );
  },
);
TabsContent.displayName = 'TabsContent';

// ---------------------------------------------------------------------------
// LegacyTabs — index-based API, kept for one release
// ---------------------------------------------------------------------------

export interface TabItem {
  label: string;
  badge?: string | number;
  disabled?: boolean;
}

/** @deprecated Use `Tabs` + `TabsList` + `TabsTrigger value`. */
export interface LegacyTabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: TabItem[];
  activeIndex: number;
  onChange: (index: number) => void;
}

/**
 * @deprecated Index-based Tabs (`tabs` / `activeIndex` / `onChange(index)`).
 * Maps index ↔ `String(index)` onto the compound `Tabs`; migrate to values.
 */
export function LegacyTabs({ tabs, activeIndex, onChange, ...listProps }: LegacyTabsProps) {
  return (
    <Tabs value={String(activeIndex)} onValueChange={(v) => onChange(Number(v))}>
      <TabsList {...listProps}>
        {tabs.map((tab, index) => (
          <TabsTrigger
            key={tab.label}
            value={String(index)}
            disabled={tab.disabled}
            {...(tab.badge !== undefined ? { badge: tab.badge } : {})}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
