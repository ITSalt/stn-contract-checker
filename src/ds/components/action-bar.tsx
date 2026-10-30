/**
 * ActionBar — the one footer bar for actions.
 * Replaces PanelFooter, FormActions, ModalFooter and SheetFooter, which stay
 * one release as deprecated wrappers.
 *
 * Recipe: `flex items-center gap-2.5 px-6 py-4` + top hairline (`divider`).
 * Gap is 10px everywhere (was 8 in SheetFooter / AlertDialog actions).
 * `align="between"` puts the first child on the left (`mr-auto`) and the rest
 * on the right; `<ActionBar.Spacer />` does the same at any position.
 */
import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '../lib/utils.js';

const actionBarVariants = cva('flex items-center gap-2.5 px-6 py-4', {
  variants: {
    align: {
      end: 'justify-end',
      between: 'justify-end [&>:first-child]:mr-auto',
      start: 'justify-start',
    },
    divider: { true: 'border-t border-border', false: '' },
    surface: { none: '', card: 'bg-card rounded-b-md' },
    sticky: { true: 'sticky bottom-0', false: '' },
  },
  compoundVariants: [{ sticky: true, surface: 'none', className: 'bg-background' }],
  defaultVariants: { align: 'end', divider: true, surface: 'none', sticky: false },
});

export interface ActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** end — buttons on the right (default); between — first child left, the rest right; start */
  align?: 'end' | 'between' | 'start';
  /** Top hairline; default true. */
  divider?: boolean;
  /** none — transparent (dialogs); card — bg-card + rounded-b-md (former FormActions in a card) */
  surface?: 'none' | 'card';
  /** sticky bottom-0 for long forms */
  sticky?: boolean;
}

const ActionBarRoot = React.forwardRef<HTMLDivElement, ActionBarProps>(
  ({ className, align, divider, surface, sticky, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(actionBarVariants({ align, divider, surface, sticky }), className)}
      {...props}
    />
  ),
);
ActionBarRoot.displayName = 'ActionBar';

/** Pushes everything after it to the right edge. */
function ActionBarSpacer() {
  return <span aria-hidden="true" className="mr-auto" />;
}

export const ActionBar = Object.assign(ActionBarRoot, { Spacer: ActionBarSpacer });
