// src/layouts/AppShell.tsx
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Upload } from 'lucide-react'

export function AppShell() {
  const navigate = useNavigate()
  return (
    // h-screen + overflow-hidden pins the layout to the viewport so the
    // sidebar never scrolls — only the main content area scrolls.
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] dark:bg-[#0d1117] transition-colors duration-300">

      {/* Sidebar is a fixed-height column, no scrolling on its own */}
      <Sidebar />

      {/* Main content: header is sticky, content area scrolls independently */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#161b22] flex-shrink-0 transition-colors duration-300">
          <div>
            <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-400 dark:text-slate-500">
              INVESTIGATION SUPPORT TOOL <span className="mx-1 text-slate-300 dark:text-slate-600">—</span> FOR AUTHORIZED USE ONLY
            </p>
          </div>
          <button
            onClick={() => navigate('/cases/upload')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload New PDF
          </button>
        </header>

        {/* This is the ONLY scrollable area — sidebar stays fixed */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#f8fafc] dark:bg-[#0d1117] transition-colors duration-300">
          <Outlet />
        </div>
      </main>
    </div>
  )
}


