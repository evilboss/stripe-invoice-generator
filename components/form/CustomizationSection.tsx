'use client';

import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';

interface Props {
  register: UseFormRegister<InvoiceData>;
  watch: UseFormWatch<InvoiceData>;
  setValue: UseFormSetValue<InvoiceData>;
}

const COLOR_PRESETS = [
  { label: 'Stripe Blue',  primary: '#635BFF', accent: '#00D4FF', headerText: '#ffffff' },
  { label: 'Midnight',     primary: '#1C2434', accent: '#3C50E0', headerText: '#ffffff' },
  { label: 'Emerald',      primary: '#059669', accent: '#10B981', headerText: '#ffffff' },
  { label: 'Rose',         primary: '#E11D48', accent: '#F43F5E', headerText: '#ffffff' },
  { label: 'Amber',        primary: '#B45309', accent: '#F59E0B', headerText: '#ffffff' },
  { label: 'Violet',       primary: '#7C3AED', accent: '#A78BFA', headerText: '#ffffff' },
  { label: 'Slate',        primary: '#334155', accent: '#64748B', headerText: '#ffffff' },
  { label: 'Cyan',         primary: '#0E7490', accent: '#06B6D4', headerText: '#ffffff' },
  { label: 'Gold on Dark', primary: '#1a1a1a', accent: '#D4AF37', headerText: '#D4AF37' },
  { label: 'Navy + White', primary: '#1e3a5f', accent: '#93c5fd', headerText: '#ffffff' },
];

export default function CustomizationSection({ register, watch, setValue }: Props) {
  const primary      = watch('primaryColor');
  const accent       = watch('accentColor');
  const headerText   = watch('headerTextColor');
  const layoutStyle  = watch('layoutStyle');

  const isClean = layoutStyle === 'clean';

  return (
    <Card title="PDF Customization" subtitle="Layout style and colour theme">
      <div className="flex flex-col gap-5">

        {/* ── Layout style ────────────────────────────────── */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Layout Style</p>
          <div className="flex gap-2">
            {/* Modern */}
            <button
              type="button"
              onClick={() => setValue('layoutStyle', 'modern')}
              className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition text-xs font-medium
                ${!isClean
                  ? 'border-[#635BFF] bg-[#635BFF]/5 text-[#635BFF]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              {/* mini modern preview */}
              <span className="w-full rounded overflow-hidden border border-gray-200">
                <span className="block h-4 w-full" style={{ backgroundColor: isClean ? '#94a3b8' : primary }} />
                <span className="block h-2 bg-white w-full" />
                <span className="block h-1.5 bg-gray-100 mx-1 mb-1 rounded" />
              </span>
              Modern (coloured header)
            </button>

            {/* Clean */}
            <button
              type="button"
              onClick={() => setValue('layoutStyle', 'clean')}
              className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition text-xs font-medium
                ${isClean
                  ? 'border-[#635BFF] bg-[#635BFF]/5 text-[#635BFF]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              {/* mini clean preview */}
              <span className="w-full rounded overflow-hidden border border-gray-200 bg-white">
                <span className="flex items-center justify-between px-1 pt-1">
                  <span className="block h-2 w-8 bg-gray-800 rounded-sm" />
                  <span className="block h-2 w-5 bg-gray-800 rounded-sm" />
                </span>
                <span className="block h-px bg-gray-300 mx-1 my-1" />
                <span className="block h-1.5 bg-gray-100 mx-1 mb-1 rounded" />
              </span>
              Clean (B&amp;W receipt)
            </button>
          </div>
        </div>

        {/* ── Color presets (modern only) ──────────────────── */}
        {!isClean && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Quick Presets</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setValue('primaryColor',    preset.primary);
                    setValue('accentColor',     preset.accent);
                    setValue('headerTextColor', preset.headerText);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-400 transition text-xs text-gray-600"
                >
                  <span className="flex gap-1">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.accent }} />
                  </span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Custom colors (modern only) ──────────────────── */}
        {!isClean && (
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Header Background">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  {...register('primaryColor')}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
                <span className="text-sm font-mono text-gray-600">{primary}</span>
              </div>
            </FormField>

            <FormField label="Header Text Color">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  {...register('headerTextColor')}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
                <span className="text-sm font-mono text-gray-600">{headerText}</span>
              </div>
            </FormField>

            <FormField label="Accent / Label Color">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  {...register('accentColor')}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
                <span className="text-sm font-mono text-gray-600">{accent}</span>
              </div>
            </FormField>
          </div>
        )}

        {/* ── Preview swatch (modern only) ─────────────────── */}
        {!isClean && (
          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="h-12 flex items-center justify-between px-5" style={{ backgroundColor: primary }}>
              <span className="font-bold text-sm" style={{ color: headerText ?? '#ffffff' }}>INVOICE</span>
              <span className="text-xs opacity-75" style={{ color: headerText ?? '#ffffff' }}>INV-2026-0001</span>
            </div>
            <div className="px-5 py-3 bg-white flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: accent }}>
                Bill To
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: accent, opacity: 0.3 }} />
            </div>
            <div className="px-5 pb-4 bg-white">
              <div className="h-2 bg-gray-100 rounded w-40 mb-2" />
              <div className="h-2 bg-gray-100 rounded w-28" />
            </div>
          </div>
        )}

        {/* ── Clean layout preview ─────────────────────────── */}
        {isClean && (
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
            <div className="px-4 pt-4 pb-2 flex items-start justify-between">
              <span className="font-bold text-base text-gray-900">Receipt</span>
              <span className="font-black text-gray-900 text-sm tracking-tight">LOGO</span>
            </div>
            <div className="px-4 pb-2 text-[10px] text-gray-600 space-y-0.5">
              <div><span className="font-semibold w-24 inline-block">Invoice number</span> INV-2026-0001</div>
              <div><span className="font-semibold w-24 inline-block">Date paid</span> Apr 23, 2026</div>
            </div>
            <div className="px-4 pb-3 border-t border-gray-100 pt-2 text-[10px] text-gray-700 font-bold">
              $36.00 paid on Apr 23, 2026
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
