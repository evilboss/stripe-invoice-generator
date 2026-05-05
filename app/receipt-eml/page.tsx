import type { Metadata } from 'next';
import Link from 'next/link';
import ReceiptEmlEditor from '@/components/ReceiptEmlEditor';

export const metadata: Metadata = {
  title: 'Receipt EML Editor — Create Demo Email Receipts',
  description: 'Create and export Stripe-style email receipts as .eml files for training and demo purposes.',
};

export default function ReceiptEmlPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#1C2434] text-white flex-shrink-0 fixed top-0 left-0 h-full z-30">
          <div className="px-6 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#635BFF] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">InvoiceGen</p>
                <p className="text-xs text-gray-400">PDF Invoice Builder</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4">
            <p className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">Tools</p>
            <ul className="mt-1 space-y-0.5">
              <li>
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-gray-400 hover:text-gray-200 hover:bg-white/5"
                >
                  <span className="text-base">📄</span>
                  Invoice Generator
                </Link>
              </li>
              <li>
                <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-[#635BFF] text-white font-medium cursor-default select-none">
                  <span className="text-base">✉️</span>
                  Receipt EML Editor
                </span>
              </li>
              <li>
                <Link
                  href="/billing-eml"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-gray-400 hover:text-gray-200 hover:bg-white/5"
                >
                  <span className="text-base">💳</span>
                  Billing EML Editor
                </Link>
              </li>
              <li>
                <Link
                  href="/subscription-eml"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-gray-400 hover:text-gray-200 hover:bg-white/5"
                >
                  <span className="text-base">📩</span>
                  Subscription EML Editor
                </Link>
              </li>
            </ul>
          </nav>

          <div className="px-4 py-4 border-t border-white/10">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs font-medium text-gray-300">Privacy First</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                All data stays in your browser. Nothing is sent to any server.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          {/* Top Header */}
          <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-lg font-bold text-gray-800">Receipt EML Editor</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Build a Stripe-style email receipt and export it as a .eml file
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Demo / Training use only
                </span>
              </div>
            </div>
          </header>

          {/* Editor — full remaining height */}
          <div className="flex-1 flex overflow-hidden">
            <ReceiptEmlEditor />
          </div>
        </main>
      </div>
    </div>
  );
}
