/**
 * Panel — structural card container (head / body / foot).
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils.js';

import { ActionBar, type ActionBarProps } from './action-bar.js';

export const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-md border border-border bg-card shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  ),
);
Panel.displayName = 'Panel';

export const PanelHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-4 border-b border-border px-6 py-[18px]',
        className,
      )}
      {...props}
    />
  ),
);
PanelHeader.displayName = 'PanelHeader';

const panelBodyVariants = cva('', {
  variants: {
    flush: {
      true: 'p-0',
      false: 'p-6',
    },
  },
  defaultVariants: {
    flush: false,
  },
});

export interface PanelBodyProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelBodyVariants> {}

export const PanelBody = React.forwardRef<HTMLDivElement, PanelBodyProps>(
  ({ className, flush, ...props }, ref) => (
    <div ref={ref} className={cn(panelBodyVariants({ flush }), className)} {...props} />
  ),
);
PanelBody.displayName = 'PanelBody';

/** @deprecated → `<ActionBar />` */
export const PanelFooter = React.forwardRef<HTMLDivElement, ActionBarProps>((props, ref) => (
  <ActionBar ref={ref} {...props} />
));
PanelFooter.displayName = 'PanelFooter';
