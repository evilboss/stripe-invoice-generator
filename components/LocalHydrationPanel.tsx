'use client';

import {
  EMPTY_HYDRATION_ID,
  isEmptyHydrationId,
  type HydrationProfile,
} from '@/lib/local-hydration';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';

type Props = {
  profiles: HydrationProfile[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  sourceDescription: string;
  hasData: boolean;
  loading?: boolean;
  applied: boolean;
  onApply: () => void;
  onReset: () => void;
  title?: string;
  emptyOptionLabel?: string;
};

export default function LocalHydrationPanel({
  profiles,
  selectedId,
  onSelectedIdChange,
  sourceDescription,
  hasData,
  loading = false,
  applied,
  onApply,
  onReset,
  title = 'Local hydration available',
  emptyOptionLabel = 'None — reset form',
}: Props) {
  if (profiles.length === 0 && !loading) return null;

  const resetMode = isEmptyHydrationId(selectedId);
  const dropdownOptions = [
    { value: EMPTY_HYDRATION_ID, label: emptyOptionLabel },
    ...profiles.map(profile => ({ value: profile.id, label: profile.label })),
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#635BFF]/20 bg-[#635BFF]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <div className="max-w-xs">
          <Select
            value={resetMode ? EMPTY_HYDRATION_ID : selectedId}
            onChange={e => onSelectedIdChange(e.target.value)}
            options={dropdownOptions}
            disabled={loading}
          />
        </div>
        <p className="text-xs text-gray-500 truncate">
          {loading
            ? 'Loading hydration files…'
            : resetMode
              ? 'Clears local prefill — use Reset form to restore defaults'
              : sourceDescription || 'No hydration files found for this profile'}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={resetMode ? onReset : onApply}
        disabled={resetMode ? loading : !hasData || loading}
        className="shrink-0"
      >
        {resetMode ? 'Reset form' : applied ? 'Reapply hydration' : 'Apply hydration'}
      </Button>
    </div>
  );
}