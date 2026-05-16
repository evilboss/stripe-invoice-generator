import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocalHydrationPanel from './LocalHydrationPanel';
import { EMPTY_HYDRATION_ID, type HydrationProfile } from '@/lib/local-hydration';

const profileA: HydrationProfile = { id: 'a', label: 'Profile A' };
const profileB: HydrationProfile = { id: 'b', label: 'Profile B' };

function baseProps(overrides: Partial<React.ComponentProps<typeof LocalHydrationPanel>> = {}) {
  return {
    profiles: [profileA, profileB],
    selectedId: profileA.id,
    onSelectedIdChange: vi.fn(),
    sourceDescription: '/local/a/file.json',
    hasData: true,
    applied: false,
    onApply: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
}

describe('LocalHydrationPanel', () => {
  it('renders nothing when there are no profiles and not loading', () => {
    const { container } = render(
      <LocalHydrationPanel {...baseProps({ profiles: [], loading: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title and source description by default', () => {
    render(<LocalHydrationPanel {...baseProps()} />);
    expect(screen.getByText('Local hydration available')).toBeInTheDocument();
    expect(screen.getByText('/local/a/file.json')).toBeInTheDocument();
  });

  it('shows the loading message instead of source when loading', () => {
    render(<LocalHydrationPanel {...baseProps({ loading: true })} />);
    expect(screen.getByText('Loading hydration files…')).toBeInTheDocument();
  });

  it('lists the empty option followed by each profile', () => {
    render(<LocalHydrationPanel {...baseProps()} />);
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map(o => ({
      value: o.value,
      label: o.textContent,
    }));
    expect(options).toEqual([
      { value: EMPTY_HYDRATION_ID, label: 'None — reset form' },
      { value: 'a', label: 'Profile A' },
      { value: 'b', label: 'Profile B' },
    ]);
  });

  it('renders the Apply button by default and calls onApply when clicked', async () => {
    const onApply = vi.fn();
    render(<LocalHydrationPanel {...baseProps({ onApply })} />);
    const button = screen.getByRole('button', { name: 'Apply hydration' });
    await userEvent.click(button);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('switches the apply button label to "Reapply hydration" when applied', () => {
    render(<LocalHydrationPanel {...baseProps({ applied: true })} />);
    expect(screen.getByRole('button', { name: 'Reapply hydration' })).toBeInTheDocument();
  });

  it('disables the apply button when there is no data', () => {
    render(<LocalHydrationPanel {...baseProps({ hasData: false })} />);
    expect(screen.getByRole('button', { name: 'Apply hydration' })).toBeDisabled();
  });

  it('enters reset mode for the empty hydration id and calls onReset on click', async () => {
    const onReset = vi.fn();
    render(
      <LocalHydrationPanel
        {...baseProps({ selectedId: EMPTY_HYDRATION_ID, onReset })}
      />,
    );
    expect(screen.getByText(/Clears local prefill/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Reset form' });
    await userEvent.click(button);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectedIdChange when a profile is picked from the dropdown', async () => {
    const onSelectedIdChange = vi.fn();
    render(<LocalHydrationPanel {...baseProps({ onSelectedIdChange })} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'b');
    expect(onSelectedIdChange).toHaveBeenCalledWith('b');
  });

  it('honors a custom title and emptyOptionLabel', () => {
    render(
      <LocalHydrationPanel
        {...baseProps({
          title: 'Custom title',
          emptyOptionLabel: 'No prefill',
        })}
      />,
    );
    expect(screen.getByText('Custom title')).toBeInTheDocument();
    expect(screen.getByText('No prefill')).toBeInTheDocument();
  });
});
