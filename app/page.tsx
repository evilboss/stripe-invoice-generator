import InvoiceForm from '@/components/InvoiceForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Sidebar + Content Layout */}
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
            <p className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">Menu</p>
            <ul className="mt-1 space-y-0.5">
              {[
                { label: 'New Invoice', icon: '📄', active: true },
                { label: 'Invoice Details', icon: '📋', active: false },
                { label: 'From (Business)', icon: '🏢', active: false },
                { label: 'Bill To (Customer)', icon: '👤', active: false },
                { label: 'Line Items', icon: '📦', active: false },
                { label: 'Adjustments', icon: '💰', active: false },
                { label: 'Payment Info', icon: '💳', active: false },
                { label: 'Notes & Terms', icon: '📝', active: false },
                { label: 'Customization', icon: '🎨', active: false },
              ].map((item) => (
                <li key={item.label}>
                  <span
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition cursor-default select-none ${
                      item.active
                        ? 'bg-[#635BFF] text-white font-medium'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </span>
                </li>
              ))}
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
        <main className="flex-1 lg:ml-64">
          {/* Top Header */}
          <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-lg font-bold text-gray-800">Invoice Generator</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Fill in the form below and generate a Stripe-style PDF invoice instantly
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  No data stored
                </span>
              </div>
            </div>
          </header>

          {/* Form */}
          <div className="px-6 py-6 max-w-7xl mx-auto">
            <InvoiceForm />
          </div>
        </main>
      </div>
    </div>
  );
}
