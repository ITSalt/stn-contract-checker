/**
 * Tooltip — lightweight hover/focus label. No Radix dependency, matches the
 * vendored shadcn-style pattern used elsewhere in components/ui.
 */
import * as React from 'react';

import { cn } from '../lib/utils.js';

export interface TooltipProps {
  label: string;
  children: React.ReactElement;
  className?: string;
}

export function Tooltip({ label, children, className }: TooltipProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-(--z-dropdown) mb-[7px] -translate-x-1/2',
          'whitespace-nowrap rounded-xs bg-foreground px-2.5 py-1.5 text-xs font-medium text-background',
          'transition-opacity duration-(--motion-fast)',
          open ? 'opacity-100' : 'opacity-0',
          className,
        )}
      >
        {label}
      </span>
    </span>
  );
}
