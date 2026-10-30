import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '../lib/utils.js';

/**
 * Single recipe for the text-control family (Input, Select, Textarea, SearchInput,
 * NumberField, ColorSwatchField). Height lives in `size` only.
 */
export const controlSurface = [
  'flex w-full rounded-sm border border-input bg-card text-sm text-foreground',
  'transition-[border-color] duration-(--motion-fast)',
  'focus-visible:focus-ring focus-visible:border-primary',
  'disabled:bg-muted disabled:text-muted-foreground disabled:disabled-dim',
].join(' ');

export const invalidSurface =
  'border-destructive focus-visible:border-destructive [--focus-ring-color:color-mix(in_srgb,var(--color-destructive)_25%,transparent)]';

export const inputVariants = cva(['placeholder:text-muted-foreground', controlSurface].join(' '), {
  variants: {
    /** md 30px / lg 40px (default). */
    size: {
      md: 'h-ctl-md px-3',
      lg: 'h-ctl-lg px-3.5',
    },
    invalid: {
      true: invalidSurface,
      false: '',
    },
  },
  defaultVariants: {
    size: 'lg',
    invalid: false,
  },
});

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Control height: md 30px, lg 40px (default). */
  size?: 'md' | 'lg';
  /** Marks the control as invalid (matches .adm-input--invalid recipe). */
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, size, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(inputVariants({ size, invalid }), className)}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
