import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders without children', () => {
    render(<Button />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // Variants — just verify each renders without throwing
  it.each(['primary', 'secondary', 'danger', 'ghost', 'outline'] as const)(
    'renders variant %s',
    (variant) => {
      render(<Button variant={variant}>Btn</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    },
  );

  // Sizes
  it.each(['sm', 'md', 'lg'] as const)('renders size %s', (size) => {
    render(<Button size={size}>Btn</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // Loading state (lines 48-53 in Button.tsx)
  it('shows spinner and disables the button when loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('svg')).toBeTruthy();
  });

  it('hides the icon when loading', () => {
    const icon = <svg data-testid="my-icon" />;
    render(<Button loading icon={icon}>Save</Button>);
    expect(screen.queryByTestId('my-icon')).not.toBeInTheDocument();
  });

  it('renders the icon when not loading', () => {
    const icon = <svg data-testid="my-icon" />;
    render(<Button icon={icon}>Save</Button>);
    expect(screen.getByTestId('my-icon')).toBeInTheDocument();
  });

  it('does not render an icon wrapper when neither loading nor icon is given', () => {
    render(<Button>Plain</Button>);
    // No span wrapper — button contains only the text node
    const btn = screen.getByRole('button');
    expect(btn.querySelector('span')).toBeNull();
  });

  // Disabled
  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  // Click
  it('fires onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // Custom className
  it('merges custom className onto the button', () => {
    render(<Button className="my-extra">Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('my-extra');
  });

  // Forwards extra props (e.g. type)
  it('passes through extra HTML attributes', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
