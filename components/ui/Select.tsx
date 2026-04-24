import { SelectHTMLAttributes, forwardRef } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { error, options, placeholder, className = '', ...props },
  ref
) {
  const base =
    'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer disabled:bg-gray-50';
  const borderClass = error ? 'border-red-400' : 'border-gray-200';

  return (
    <div className="relative">
      <select ref={ref} className={`${base} ${borderClass} pr-8 ${className}`} {...props}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L1 3h10L6 8z" />
        </svg>
      </span>
    </div>
  );
});

export default Select;
