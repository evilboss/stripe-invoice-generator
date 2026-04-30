import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  prefix?: string;
  suffix?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { error, prefix, suffix, className = '', value, ...props },
  ref
) {
  // Normalize undefined → '' so the input is always controlled
  const safeValue = value ?? '';

  const base =
    'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed';
  const borderClass = error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-200';

  if (prefix || suffix) {
    return (
      <div className="flex items-center rounded-lg border border-gray-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 overflow-hidden">
        {prefix && (
          <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          className={`flex-1 px-3 py-2 text-sm text-gray-800 outline-none bg-transparent ${className}`}
          value={safeValue}
          {...props}
        />
        {suffix && (
          <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 select-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={`${base} ${borderClass} ${className}`}
      value={safeValue}
      {...props}
    />
  );
});

export default Input;
