import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';

describe('Input', () => {
  it('renders a plain input', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  // Error border
  it('applies error border when error={true}', () => {
    render(<Input error />);
    expect(screen.getByRole('textbox')).toHaveClass('border-red-400');
  });

  it('applies default border when error is not set', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveClass('border-gray-200');
    expect(screen.getByRole('textbox')).not.toHaveClass('border-red-400');
  });

  // Prefix / suffix (the wrapper branch in Input.tsx)
  it('renders prefix text in a span', () => {
    render(<Input prefix="$" />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('renders suffix text in a span', () => {
    render(<Input suffix="%" />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('renders both prefix and suffix together', () => {
    render(<Input prefix="$" suffix="USD" />);
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  // Controlled mode: value normalisation (value ?? '' fallback)
  it('renders empty string when value is undefined (controlled)', () => {
    render(<Input value={undefined} onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('renders the given value in controlled mode', () => {
    render(<Input value="hello" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('hello');
  });

  // forwardRef
  it('forwards ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  // Disabled
  it('renders as disabled when disabled prop is set', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  // Custom className
  it('merges custom className onto the input', () => {
    render(<Input className="my-extra" />);
    expect(screen.getByRole('textbox')).toHaveClass('my-extra');
  });

  // onChange fires
  it('fires onChange as the user types', async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'ab');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  // placeholder
  it('passes through placeholder attribute', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });
});
