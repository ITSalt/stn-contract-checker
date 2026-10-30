/**
 * EmptyState — centered icon + title + description + optional action.
 */
import * as React from 'react';

import { cn } from '../lib/utils.js';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}
      {...props}
    >
      {icon && (
        <div className="flex h-13 w-13 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="it-h3">{title}</p>
      {description && <p className="it-small max-w-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';
