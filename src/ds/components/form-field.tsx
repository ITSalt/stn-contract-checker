import * as React from 'react';

import { cn } from '../lib/utils.js';

export interface FormFieldProps {
  /** Field label text (rendered above the control). */
  label?: React.ReactNode;
  /** Marks the field as required — renders a small marker next to the label. */
  required?: boolean;
  /** Helper text shown below the control when there is no error. */
  hint?: React.ReactNode;
  /** Validation error text — takes precedence over `hint` when present. */
  error?: React.ReactNode;
  /** Explicit id for the control; falls back to a generated id or the child's own id. */
  id?: string;
  /** Single control element (input/select/textarea/...). FormField is RHF-agnostic —
   * it only wires id/aria-describedby/aria-invalid, it does not call register(). */
  children: React.ReactElement<Record<string, unknown>>;
  className?: string;
}

/**
 * FormField — label + required marker + hint + error slot around a single control.
 * Mirrors `.adm-field` (`__label`, `__req`, `__hint`, `__error`) from the DS recipes.
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, required, hint, error, id, children, className }, ref) => {
    const generatedId = React.useId();
    const childProps = children.props as { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' };
    const fieldId = id ?? childProps.id ?? generatedId;
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;
    const describedBy = childProps['aria-describedby'] ?? ([errorId, !error ? hintId : undefined].filter(Boolean).join(' ') || undefined);

    const control = React.cloneElement(children, {
      id: childProps.id ?? fieldId,
      'aria-describedby': describedBy,
      'aria-invalid': childProps['aria-invalid'] ?? (error ? true : undefined),
    });

    return (
      <div ref={ref} className={cn('flex flex-col gap-[7px]', className)}>
        {label && (
          <label htmlFor={fieldId} className="flex items-center gap-1 text-[13px] font-semibold leading-tight text-foreground">
            {label}
            {required && (
              <span aria-hidden="true" className="text-primary">
                *
              </span>
            )}
          </label>
        )}
        {control}
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium leading-snug text-destructive">
            {error}
          </p>
        ) : (
          hint && (
            <p id={hintId} className="text-xs leading-snug text-muted-foreground">
              {hint}
            </p>
          )
        )}
      </div>
    );
  },
);
FormField.displayName = 'FormField';
