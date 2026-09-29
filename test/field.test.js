import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Field from '@/components/ui/Field';

describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field label="Design no.">
        <input type="text" className="form-input" />
      </Field>
    );

    // getByLabelText only resolves when label and control are actually linked.
    expect(screen.getByLabelText('Design no.')).toBeInTheDocument();
  });

  it('does not overwrite an id the caller supplied', () => {
    render(
      <Field label="Buyer" htmlFor="buyer-select">
        <select id="buyer-select" className="form-select">
          <option>Acme</option>
        </select>
      </Field>
    );

    expect(screen.getByLabelText('Buyer')).toHaveAttribute('id', 'buyer-select');
  });

  it('generates unique ids across instances', () => {
    render(
      <>
        <Field label="First">
          <input type="text" />
        </Field>
        <Field label="Second">
          <input type="text" />
        </Field>
      </>
    );

    const first = screen.getByLabelText('First');
    const second = screen.getByLabelText('Second');
    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
  });

  it('links a hint through aria-describedby', () => {
    render(
      <Field label="Cost price" hint="Internal — not shown to the buyer">
        <input type="number" />
      </Field>
    );

    const input = screen.getByLabelText('Cost price');
    const hint = screen.getByText('Internal — not shown to the buyer');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('marks the control invalid and announces the error', () => {
    render(
      <Field label="Buyer" error="Select a buyer before saving.">
        <select />
      </Field>
    );

    const control = screen.getByLabelText('Buyer');
    const error = screen.getByRole('alert');

    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(error).toHaveTextContent('Select a buyer before saving.');
    expect(control.getAttribute('aria-describedby')).toBe(error.id);
  });

  it('shows the error instead of the hint when both are given', () => {
    render(
      <Field label="Qty" hint="Whole units" error="Must be greater than zero.">
        <input type="number" />
      </Field>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Must be greater than zero.');
    expect(screen.queryByText('Whole units')).not.toBeInTheDocument();
  });

  it('is not marked invalid when there is no error', () => {
    render(
      <Field label="Remarks">
        <input type="text" />
      </Field>
    );

    expect(screen.getByLabelText('Remarks')).not.toHaveAttribute('aria-invalid');
  });

  it('marks required fields for both sighted and assistive users', () => {
    render(
      <Field label="Buyer" required>
        <select />
      </Field>
    );

    // The asterisk is decorative; the text alternative carries the meaning.
    expect(screen.getByText('(required)', { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText(/Buyer/)).toBeInTheDocument();
  });

  it('keeps controlled inputs controlled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Field label="Search">
        <input type="text" value="initial" onChange={onChange} className="form-input" />
      </Field>
    );

    const input = screen.getByLabelText('Search');
    expect(input).toHaveValue('initial');

    await user.type(input, 'x');
    expect(onChange).toHaveBeenCalled();
    // Still driven by the prop, not by internal state.
    expect(input).toHaveValue('initial');
  });

  it('supports a function child for controls it cannot clone', () => {
    render(
      <Field label="Range" hint="Inclusive">
        {({ id, describedBy, invalid }) => (
          <div>
            <input id={id} aria-describedby={describedBy} aria-invalid={invalid ? 'true' : undefined} />
            <input aria-label="Range end" />
          </div>
        )}
      </Field>
    );

    const start = screen.getByLabelText('Range');
    expect(start).toBeInTheDocument();
    expect(start.getAttribute('aria-describedby')).toBe(screen.getByText('Inclusive').id);
    expect(screen.getByLabelText('Range end')).toBeInTheDocument();
  });

  it('respects aria attributes the caller set explicitly', () => {
    render(
      <Field label="Code" error="Taken">
        <input aria-invalid="false" />
      </Field>
    );

    expect(screen.getByLabelText('Code')).toHaveAttribute('aria-invalid', 'false');
  });

  it('renders without a label', () => {
    render(
      <Field>
        <input aria-label="Bare" />
      </Field>
    );

    expect(screen.getByLabelText('Bare')).toBeInTheDocument();
    expect(document.querySelector('label')).toBeNull();
  });

  it('uses semantic tokens rather than hardcoded greys', () => {
    const { container } = render(
      <Field label="Buyer" hint="Pick one">
        <input />
      </Field>
    );

    const html = container.innerHTML;
    expect(html).toContain('text-fg-muted');
    expect(html).toContain('text-fg-subtle');
    expect(html).not.toContain('text-gray-700');
    expect(html).not.toContain('text-gray-500');
  });
});
