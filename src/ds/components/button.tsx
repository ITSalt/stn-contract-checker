import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils.js';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-sm font-semibold whitespace-nowrap',
    'transition-[background-color,border-color,box-shadow] duration-(--motion-fast)',
    'motion-safe:transition-[transform] motion-safe:duration-(--motion-fast)',
    'focus-visible:focus-ring',
    'disabled:pointer-events-none disabled:disabled-dim',
    'motion-safe:active:translate-y-px active:shadow-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-orange hover:bg-primary-hover',
        outline:
          'border border-border bg-card text-foreground shadow-soft hover:border-border-strong hover:hover-card',
        ghost: 'bg-transparent text-slate-deep hover:hover-paper',
        danger: 'bg-destructive text-destructive-foreground hover:bg-danger-hover',
      },
      size: {
        sm: 'h-ctl-md px-3.5 text-xs',
        md: 'h-ctl-lg px-[18px] text-sm',
        lg: 'h-ctl-xl px-8 text-base',
        /** @deprecated → `md` */
        default: 'h-ctl-lg px-[18px] text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
