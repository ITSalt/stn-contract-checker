/**
 * IconButton — icon-only square control.
 *
 * Styled:
 * sm/md/lg = 26/30/40px square, radius-sm, hairline border, transparent
 * background, hover → paper tint (`hover-paper`). `aria-label` is
 * mandatory — this control never carries visible text.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils.js';

export const iconButtonVariants = cva(
  [
    'inline-flex items-center justify-center rounded-sm border border-border',
    'bg-transparent text-muted-foreground',
    'transition-colors duration-(--motion-fast)',
    'hover:hover-paper hover:text-foreground',
    'focus-visible:focus-ring',
    'disabled:pointer-events-none disabled:disabled-dim',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-ctl-sm w-ctl-sm',
        md: 'h-ctl-md w-ctl-md',
        lg: 'h-ctl-lg w-ctl-lg',
        /** @deprecated → `md` */
        default: 'h-ctl-md w-ctl-md',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>,
    VariantProps<typeof iconButtonVariants> {
  /** Required — icon-only control has no visible text label. */
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(iconButtonVariants({ size }), className)}
        {...props}
      />
    );
  },
);
IconButton.displayName = 'IconButton';
