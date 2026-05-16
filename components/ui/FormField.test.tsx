import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormField from './FormField';

describe('FormField', () => {
  it('renders children', () => {
    render(
      <FormField>
        <input data-testid="child" />
      </FormField>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders label when provided and ties htmlFor to the input', () => {
    render(
      <FormField label="Email" htmlFor="email-input">
        <input id="email-input" />
      </FormField>,
    );
    const label = screen.getByText('Email');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('omits the label element when label prop is not given', () => {
    render(
      <FormField>
        <input data-testid="child" />
      </FormField>,
    );
    expect(screen.queryByText(/./, { selector: 'label' })).not.toBeInTheDocument();
  });

  it('renders the required marker when required', () => {
    render(
      <FormField label="Name" required>
        <input />
      </FormField>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders hint when provided and no error', () => {
    render(
      <FormField label="Name" hint="Your full name">
        <input />
      </FormField>,
    );
    expect(screen.getByText('Your full name')).toBeInTheDocument();
  });

  it('renders error and hides hint when error is present', () => {
    render(
      <FormField label="Name" hint="Your full name" error="Required field">
        <input />
      </FormField>,
    );
    expect(screen.getByText('Required field')).toBeInTheDocument();
    expect(screen.queryByText('Your full name')).not.toBeInTheDocument();
  });

  it('applies extra className to the wrapper', () => {
    const { container } = render(
      <FormField className="custom-class">
        <input />
      </FormField>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
