/**
 * Alert — unified inline-banner primitive for SSE/form/step errors and notices.
 * Mirrors the `.adm-alert` recipe with the
 * tone table (lib/tone.ts): `info` is fog/slate, `success` petrol, `warning` burnt
 * orange, `danger` the own destructive red. Optional leading mono tag and trailing
 * action slot.
 *
 * Replaces the ad-hoc banners in TaskDetailPage (SSE), CreateSessionForm
 * (submit error), EditAssetDialog (PARENT_TASK_NOT_COMPLETED) — migration
 * happens in the tasks that own those screen files (waves 30-32).
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { toneClasses, type Tone } from '../lib/tone.js';
import { cn } from '../lib/utils.js';

export const alertVariants = cva(
  'flex items-start gap-3 rounded-sm border px-4 py-3 text-sm leading-relaxed',
  {
    variants: {
      tone: {
        info: `border-current/30 ${toneClasses.info.soft}`,
        success: `border-current/30 ${toneClasses.success.soft}`,
        warning: `border-current/30 ${toneClasses.warning.soft}`,
        danger: `border-current/30 ${toneClasses.danger.soft}`,
      },
    },
    defaultVariants: {
      tone: 'info',
    },
  },
);

/** The 4 tones an Alert may use. */
export type AlertTone = Extract<Tone, 'info' | 'success' | 'warning' | 'danger'>;

const ALERT_ROLE_TONES: readonly AlertTone[] = ['warning', 'danger'];

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Optional leading mono label (e.g. an error code). */
  tag?: string;
  /** Optional trailing slot for a retry/dismiss control. */
  action?: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = 'info', tag, action, role, children, ...props }, ref) => {
    const resolvedRole = role ?? (ALERT_ROLE_TONES.includes(tone!) ? 'alert' : 'status');

    return (
      <div
        ref={ref}
        role={resolvedRole}
        className={cn(alertVariants({ tone }), className)}
        {...props}
      >
        {tag ? (
          <span
            data-slot="alert-tag"
            className="mt-0.5 shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.1em]"
          >
            {tag}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  },
);
Alert.displayName = 'Alert';
