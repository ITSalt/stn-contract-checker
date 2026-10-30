/**
 * DescriptionList — term/value pairs matching the `.adm-dl` DS recipe
 * Used for entity-detail views (e.g. task/session summary panels).
 */
import * as React from 'react';

import { cn } from '../lib/utils.js';

export interface DescriptionListItem {
  /** Stable key for the row; falls back to the term string when omitted. */
  key?: string;
  term: React.ReactNode;
  value: React.ReactNode;
}

export interface DescriptionListProps extends React.HTMLAttributes<HTMLDListElement> {
  items: DescriptionListItem[];
}

export const DescriptionList = React.forwardRef<HTMLDListElement, DescriptionListProps>(
  ({ className, items, ...props }, ref) => {
    return (
      <dl ref={ref} className={cn('grid gap-0 font-sans text-sm text-foreground', className)} {...props}>
        {items.map((item, index) => (
          <div
            key={item.key ?? index}
            className="grid grid-cols-[minmax(120px,34%)_1fr] gap-4 border-b border-dashed border-border-paper py-2.5 last:border-b-0"
          >
            <dt className="font-mono text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
              {item.term}
            </dt>
            <dd className="text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  },
);
DescriptionList.displayName = 'DescriptionList';
