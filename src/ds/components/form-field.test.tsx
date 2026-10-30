// @vitest-environment jsdom
import '../test-setup.ts';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { FormField } from './form-field.js';

describe('FormField', () => {
  it('renders the label and wires it to the control via htmlFor/id', () => {
    render(
      <FormField label="Название сессии" id="session-name">
        <input type="text" />
      </FormField>,
    );

    const control = screen.getByLabelText('Название сессии');
    expect(control).toBeInstanceOf(HTMLInputElement);
    expect(control).toHaveAttribute('id', 'session-name');
  });

  it('renders a required marker next to the label when required=true', () => {
    render(
      <FormField label="Категория" required id="category">
        <input type="text" />
      </FormField>,
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not render a required marker when required is not set', () => {
    render(
      <FormField label="Категория" id="category">
        <input type="text" />
      </FormField>,
    );

    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('renders hint text and links it via aria-describedby when there is no error', () => {
    render(
      <FormField label="Название" id="name" hint="Необязательное поле">
        <input type="text" />
      </FormField>,
    );

    const control = screen.getByLabelText('Название');
    const hint = screen.getByText('Необязательное поле');
    expect(control).toHaveAttribute('aria-describedby', hint.id);
  });

  it('renders the error message with role=alert, hides the hint, and marks the control invalid', () => {
    render(
      <FormField label="Категория" id="category" hint="Выберите одну из категорий" error="Выберите категорию">
        <input type="text" />
      </FormField>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Выберите категорию');
    expect(screen.queryByText('Выберите одну из категорий')).not.toBeInTheDocument();

    const control = screen.getByLabelText('Категория');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAttribute('aria-describedby', alert.id);
  });

  it('generates an id when none is provided so label/control association still works', () => {
    render(
      <FormField label="Свободное поле">
        <input type="text" />
      </FormField>,
    );

    const control = screen.getByLabelText('Свободное поле');
    expect(control).toHaveAttribute('id');
  });
});
