import { ReactNode } from 'react';

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function Card({ title, subtitle, children, className = '', action }: Props) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-800">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
