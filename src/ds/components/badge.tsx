/**
 * Badge — unified pill primitive for domain-status indicators, counters and codes.
 * Mirrors the `.adm-badge` recipe:
 * pill, 6 tonal variants, optional leading icon / dot.
 *
 * Consumed by TaskStatusBadge, WorkStatusBadge, VerdictBadge, RoleBadge,
 * FreshnessBadge — see lib/status-tone.ts for the domain-status→tone maps —
 * and by Tabs (counter), SidebarNav, LibraryGroupRow, StepChip.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { toneClasses, type Tone } from '../lib/tone.js';
import { cn } from '../lib/utils.js';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold leading-none',
  {
    variants: {
      size: {
        sm: 'h-[18px] px-2 text-[10px]',
        md: 'h-ctl-xs px-2.5 text-[11px]',
      },
      mono: {
        false: 'font-sans uppercase tracking-[0.06em]',
        true: 'font-mono tracking-normal',
      },
      variant: {
        soft: '',
        solid: '',
        outline: 'border bg-transparent',
      },
      tone: {
        neutral: '',
        success: '',
        warning: '',
        danger: '',
        info: '',
        accent: '',
      },
      dashed: {
        true: 'border border-dashed border-border',
        false: '',
      },
    },
    compoundVariants: [
      { variant: 'soft', tone: 'neutral', className: toneClasses.neutral.soft },
      { variant: 'soft', tone: 'success', className: toneClasses.success.soft },
      { variant: 'soft', tone: 'warning', className: toneClasses.warning.soft },
      { variant: 'soft', tone: 'danger', className: toneClasses.danger.soft },
      { variant: 'soft', tone: 'info', className: toneClasses.info.soft },
      { variant: 'soft', tone: 'accent', className: toneClasses.accent.soft },
      { variant: 'solid', tone: 'neutral', className: toneClasses.neutral.solid },
      { variant: 'solid', tone: 'success', className: toneClasses.success.solid },
      { variant: 'solid', tone: 'warning', className: toneClasses.warning.solid },
      { variant: 'solid', tone: 'danger', className: toneClasses.danger.solid },
      { variant: 'solid', tone: 'info', className: toneClasses.info.solid },
      // accent: soft === solid — the orange fill is the only "orange" badge.
      { variant: 'solid', tone: 'accent', className: toneClasses.accent.solid },
      {
        variant: 'outline',
        tone: 'neutral',
        className: 'border-tone-neutral-fg/30 text-tone-neutral-fg',
      },
      {
        variant: 'outline',
        tone: 'success',
        className: 'border-tone-success-fg/30 text-tone-success-fg',
      },
      {
        variant: 'outline',
        tone: 'warning',
        className: 'border-tone-warning-fg/30 text-tone-warning-fg',
      },
      {
        variant: 'outline',
        tone: 'danger',
        className: 'border-tone-danger-fg/30 text-tone-danger-fg',
      },
      { variant: 'outline', tone: 'info', className: 'border-tone-info-fg/30 text-tone-info-fg' },
      {
        variant: 'outline',
        tone: 'accent',
        className: 'border-tone-accent-bg/30 text-tone-accent-bg',
      },
    ],
    defaultVariants: {
      size: 'md',
      mono: false,
      variant: 'soft',
      tone: 'neutral',
      dashed: false,
    },
  },
);

/** The 6 tones a Badge (and the domain-status→tone maps) may use. */
export type BadgeTone = Tone;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Renders a small `currentColor` dot before the label (adm-badge__dot). */
  dot?: boolean;
  /** Leading lucide icon, 12px (md) / 10px (sm). */
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, tone, variant, size, mono, dashed, dot = false, icon, children, ...props },
    ref,
  ) => (
    <span
      ref={ref}
      className={cn(
        badgeVariants({ tone, variant, size, mono, dashed }),
        icon && '[&>svg]:shrink-0',
        icon && (size === 'sm' ? '[&>svg]:size-2.5' : '[&>svg]:size-3'),
        className,
      )}
      {...props}
    >
      {dot ? (
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      ) : null}
      {icon ?? null}
      {children}
    </span>
  ),
);
Badge.displayName = 'Badge';
