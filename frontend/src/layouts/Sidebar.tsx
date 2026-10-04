import { NavLink, Link } from 'react-router-dom'
import {
  Upload,
  Network,
  ReceiptText,
  FileSearch,
  BarChart3,
  Info,
  Sun,
  Moon,
} from 'lucide-react'
import symbolLogo from '@/logo/symbol.png'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

const NAV_ITEMS = [
  { to: '/cases/upload', icon: Upload,      label: 'New Analysis' },
  { to: '/transactions', icon: ReceiptText, label: 'Transactions' },
  { to: '/money-trail',  icon: Network,     label: 'Money Trail' },
  { to: '/evidence',     icon: FileSearch,  label: 'Evidence' },
  { to: '/reports',      icon: BarChart3,   label: 'Reports' },
]

export function Sidebar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="flex flex-col h-full w-64 bg-white dark:bg-[#161b22] border-r border-slate-200 dark:border-slate-700/60 shrink-0 transition-colors duration-300">
      {/* Logo Header - Clickable to Home Page */}
      <Link to="/" className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
        <img
          src={symbolLogo}
          alt="CyberTrail Symbol"
          className="w-14 h-14 object-contain shrink-0 drop-shadow-sm group-hover:scale-105 transition-transform"
        />
        <div>
          <p className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            Cyber<span className="text-emerald-600 dark:text-emerald-400">Trail</span>
          </p>
          <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 tracking-widest uppercase mt-0.5">
            Money Trail Analyzer
          </p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-150',
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 shadow-xs font-extrabold border-l-4 border-emerald-500'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              )
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 pb-3">
        <button
          onClick={toggleTheme}
          title="Toggle light/dark mode"
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-150"
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4" />
          }
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* Analysis Session Banner */}
      <div className="p-4 m-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 text-sm text-slate-700 dark:text-slate-300">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Analysis Session</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Data will be cleared when you close or refresh this page.
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
