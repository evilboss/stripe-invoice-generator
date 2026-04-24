import { TextareaHTMLAttributes, forwardRef } from 'react';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { error, className = '', ...props },
  ref
) {
  const base =
    'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none disabled:bg-gray-50';
  const borderClass = error ? 'border-red-400' : 'border-gray-200';

  return <textarea ref={ref} rows={3} className={`${base} ${borderClass} ${className}`} {...props} />;
});

export default Textarea;
