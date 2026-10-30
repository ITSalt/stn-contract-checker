/**
 * PageHeader — it-h2 title (rendered as <h1>) + orange it-rule bar +
 * actions slot. Optional eyebrow label above the title and description below the rule.
 */
import * as React from 'react';

import { cn } from '../lib/utils.js';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Show the orange it-rule bar under the title. Defaults to true. */
  rule?: boolean;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, eyebrow, title, description, actions, rule = true, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
      {eyebrow && <span className="it-eyebrow">{eyebrow}</span>}
      <div className="flex items-start justify-between gap-4">
        <h1 className="it-h2">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {rule && <span className="it-rule h-1 w-11" aria-hidden="true" />}
      {description && (
        <p data-slot="page-header-description" className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  ),
);
PageHeader.displayName = 'PageHeader';
