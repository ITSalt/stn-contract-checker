import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Control-height scale from index.css (`--spacing-ctl-*`): h-ctl-xs … h-ctl-xl. */
const CTL = ['xs', 'sm', 'md', 'lg', 'xl'].map((s) => `ctl-${s}`);

/**
 * twMerge that knows the design-system utilities, so a caller's `className`
 * overrides the primitive's own class instead of fighting it in CSS order:
 * - `h-ctl-*` / `w-ctl-*` / `size-ctl-*` merge with `h-9`, `w-8`, `size-8` …
 * - `hover-paper` / `hover-card` (hover surfaces) merge with `bg-*` colours;
 * - `disabled-dim` merges with `opacity-*`.
 */
const twMerge = extendTailwindMerge<'hover-surface' | 'disabled-dim'>({
  extend: {
    classGroups: {
      h: [{ h: CTL }],
      w: [{ w: CTL }],
      size: [{ size: CTL }],
      'hover-surface': ['hover-paper', 'hover-card'],
      'disabled-dim': ['disabled-dim'],
    },
    conflictingClassGroups: {
      'hover-surface': ['bg-color'],
      'bg-color': ['hover-surface'],
      'disabled-dim': ['opacity'],
      opacity: ['disabled-dim'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
