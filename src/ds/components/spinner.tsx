/**
 * Spinner — loading indicator.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils.js';

const spinnerVariants = cva('inline-block animate-spin rounded-full border-border border-t-primary', {
  variants: {
    size: {
      sm: 'h-4 w-4 border-2',
      md: 'h-6 w-6 border-2',
      lg: 'h-9 w-9 border-[3px]',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size, label = 'Loading', ...props }, ref) => (
    <span
      ref={ref}
      role="status"
      aria-label={label}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  ),
);
Spinner.displayName = 'Spinner';
