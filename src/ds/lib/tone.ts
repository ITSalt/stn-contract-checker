/**
 * lib/tone.ts — the single tone table.
 * Badge, Alert, Toaster and StatCard take their colours ONLY from here;
 * the underlying `--color-tone-*` tokens live in index.css.
 *
 * Class strings are written out in full so Tailwind can see them.
 */
export type Tone = 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'accent';

export interface ToneClasses {
  /** Soft fill + coloured text (Badge, Alert). */
  soft: string;
  /** Saturated fill + contrast text. */
  solid: string;
  /** Text colour only. */
  fg: string;
  /** Left colour bar (Toaster). */
  stripe: string;
}

export const toneClasses: Record<Tone, ToneClasses> = {
  neutral: {
    soft: 'bg-tone-neutral-bg text-tone-neutral-fg',
    solid: 'bg-tone-neutral-fg text-white',
    fg: 'text-tone-neutral-fg',
    stripe: 'border-l-tone-neutral-fg!',
  },
  success: {
    soft: 'bg-tone-success-bg text-tone-success-fg',
    solid: 'bg-tone-success-fg text-white',
    fg: 'text-tone-success-fg',
    stripe: 'border-l-tone-success-fg!',
  },
  info: {
    soft: 'bg-tone-info-bg text-tone-info-fg',
    solid: 'bg-tone-info-fg text-white',
    fg: 'text-tone-info-fg',
    stripe: 'border-l-tone-info-fg!',
  },
  warning: {
    soft: 'bg-tone-warning-bg text-tone-warning-fg',
    solid: 'bg-tone-warning-fg text-white',
    fg: 'text-tone-warning-fg',
    stripe: 'border-l-tone-warning-fg!',
  },
  danger: {
    soft: 'bg-tone-danger-bg text-tone-danger-fg',
    solid: 'bg-tone-danger-fg text-white',
    fg: 'text-tone-danger-fg',
    stripe: 'border-l-tone-danger-fg!',
  },
  accent: {
    soft: 'bg-tone-accent-bg text-tone-accent-fg',
    solid: 'bg-tone-accent-bg text-tone-accent-fg',
    fg: 'text-tone-accent-bg',
    stripe: 'border-l-tone-accent-bg!',
  },
};
