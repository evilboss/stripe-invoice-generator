import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from './Select';

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('Select', () => {
  it('renders all options', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gamma' })).toBeInTheDocument();
  });

  it('renders an empty select when options array is empty', () => {
    render(<Select options={[]} />);
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  // Placeholder (lines 20-22 in Select.tsx)
  it('renders placeholder as the first disabled option', () => {
    render(<Select options={OPTIONS} placeholder="Choose…" />);
    const ph = screen.getByRole('option', { name: 'Choose…' });
    expect(ph).toBeDisabled();
    expect(ph).toHaveAttribute('value', '');
  });

  it('renders placeholder before the regular options', () => {
    render(<Select options={OPTIONS} placeholder="Pick one" />);
    const allOptions = screen.getAllByRole('option');
    expect(allOptions[0]).toHaveTextContent('Pick one');
    expect(allOptions).toHaveLength(OPTIONS.length + 1);
  });

  it('does not render a placeholder option when prop is omitted', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
  });

  // Error border (line 15 in Select.tsx)
  it('applies error border class when error={true}', () => {
    render(<Select options={OPTIONS} error />);
    expect(screen.getByRole('combobox')).toHaveClass('border-red-400');
  });

  it('applies default border class when error is not set', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getByRole('combobox')).toHaveClass('border-gray-200');
    expect(screen.getByRole('combobox')).not.toHaveClass('border-red-400');
  });

  // Custom className
  it('merges custom className onto the select element', () => {
    render(<Select options={OPTIONS} className="w-64" />);
    expect(screen.getByRole('combobox')).toHaveClass('w-64');
  });

  // forwardRef
  it('forwards ref to the underlying select element', () => {
    const ref = createRef<HTMLSelectElement>();
    render(<Select options={OPTIONS} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  // onChange
  it('calls onChange when the user selects an option', async () => {
    const onChange = vi.fn();
    render(<Select options={OPTIONS} onChange={onChange} defaultValue="a" />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'b');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0][0] as React.ChangeEvent<HTMLSelectElement>).target.value).toBe('b');
  });

  // Disabled
  it('renders as disabled when disabled prop is set', () => {
    render(<Select options={OPTIONS} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
