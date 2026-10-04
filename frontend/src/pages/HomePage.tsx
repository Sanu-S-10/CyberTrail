// src/pages/HomePage.tsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  Sun,
  Moon,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Loader2,
  Landmark,
  UserRound,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
  AlertCircle,
  Home as HomeIcon,
  ReceiptText,
  FileSearch,
  BarChart3,
} from 'lucide-react'
import { useAnalysis } from '@/contexts/AnalysisContext'
import { useTheme } from '@/contexts/ThemeContext'
import symbolLogo from '@/logo/symbol.png'
import { cn } from '@/lib/utils'


export function HomePage() {
  const navigate = useNavigate()
  const { setAnalysis, clearAnalysis } = useAnalysis()
  const { theme, toggleTheme } = useTheme()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null)

  function triggerFileUpload() {
    setError(null)
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const fn = selectedFile.name.toLowerCase()
    const isValidType = selectedFile.type === 'application/pdf' || fn.endsWith('.pdf') || fn.endsWith('.xlsx') || fn.endsWith('.xls')
    if (!isValidType) {
      setError('Invalid file type. Please select an official PDF or Excel (.xlsx, .xls) document.')
      return
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50 MB limit. Please select a smaller PDF file.')
      return
    }

    setError(null)
    setUploading(true)
    setUploadingFileName(selectedFile.name)
    clearAnalysis()

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/cases/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to upload complaint document.')
      }

      const data = await response.json()
      setAnalysis(data)
      navigate(`/cases/${data.analysis_id}/processing`)
    } catch (err: any) {
      setError(err.message || 'Unable to process the uploaded document.')
    } finally {
      setUploading(false)
      setUploadingFileName(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleLoadDemo() {
    setAnalysis({
      analysis_id: 'demo-sample-case',
      expires_in_seconds: 3600,
      demo_data: true,
      case: {
        total_fraud_amount: 2450000,
        total_accounts: 18,
        total_transactions: 27,
        maximum_layer: 4,
      },
      accounts: [],
      transactions: [],
      graph: { nodes: [], edges: [] },
      layers: [0, 1, 2, 3, 4],
      pages: {},
      sections: [],
    })
    navigate('/money-trail')
  }

  function scrollToHowItWorks() {
    const el = document.getElementById('how-it-works-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2fbf7] via-white to-[#e8f7f2] dark:from-[#0d1117] dark:via-[#0d1117] dark:to-[#0d1117] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-emerald-200 selection:text-emerald-900 relative overflow-x-hidden transition-colors duration-300">
      {/* Hidden Native File Input for Direct File Manager Trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,application/vnd.ms-excel,.xls"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Full Screen Loading Overlay while parsing document */}
      {uploading && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-xl">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-black tracking-tight">Uploading &amp; Parsing Document…</p>
            {uploadingFileName && <p className="text-xs text-emerald-300 font-mono mt-1">{uploadingFileName}</p>}
          </div>
        </div>
      )}

      {/* ── Top Header Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#161b22]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/60 px-6 lg:px-12 py-3.5 flex items-center justify-between shadow-2xs transition-colors duration-300">
        {/* Brand Logo - CyberTrail */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src={symbolLogo}
            alt="CyberTrail Symbol"
            className="w-10 h-10 object-contain drop-shadow-2xs"
          />
          <div>
            <p className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
              Cyber<span className="text-emerald-600 dark:text-emerald-400">Trail</span>
            </p>
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 tracking-widest uppercase mt-0.5">
              Money Trail Analyzer
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            title="Toggle theme"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 flex items-center justify-center transition-all shadow-2xs"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={triggerFileUpload}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </header>

      {/* Error Toast Notification if file upload fails */}
      {error && (
        <div className="max-w-xl mx-auto my-3 px-4 w-full">
          <div className="flex items-center justify-between gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-xs text-red-700 dark:text-red-400 shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-semibold">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Main Hero Section with 3D Mockup & Wave Graphic ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-8 lg:py-14 flex flex-col justify-between gap-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column Text & Call to Action (Shifted 1cm Left) */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:-ml-8 xl:-ml-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider w-fit shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              INVESTIGATION SUPPORT TOOL
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-[1.06]">
              Analyze.
              <br />
              Trace.
              <br />
              <span className="text-emerald-600 dark:text-emerald-400 font-black bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                Uncover Fraud.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed max-w-lg font-medium">
              Upload bank statements, visualize money trails, and identify suspicious transactions with clear insights and reports.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={triggerFileUpload}
                disabled={uploading}
                className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-base font-extrabold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                Upload Document
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={handleLoadDemo}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold shadow-xs transition-all"
              >
                <Network className="w-4 h-4 text-emerald-600" />
                Explore Demo Trail
              </button>
            </div>
          </div>

          {/* Right Column: Tilted 3D Mockup Preview Card (Shifted 1cm Right) */}
          <div className="lg:col-span-7 relative flex justify-center lg:justify-end lg:translate-x-8 xl:translate-x-12">
            {/* Soft Ambient Glow */}
            <div className="absolute -inset-6 bg-gradient-to-tr from-emerald-400/20 via-teal-300/20 to-blue-400/15 rounded-3xl blur-3xl opacity-75 pointer-events-none" />

            {/* 3D Perspective Canvas Card Container */}
            <div
              style={{
                transform: 'perspective(1400px) rotateY(-13deg) rotateX(6deg) rotateZ(1deg)',
                transformStyle: 'preserve-3d',
              }}
              className="relative w-full max-w-[650px] rounded-[28px] bg-white dark:bg-[#161b22] border border-slate-200/90 dark:border-slate-700/60 shadow-[0_30px_80px_rgba(16,185,129,0.18)] dark:shadow-[0_30px_80px_rgba(16,185,129,0.10)] p-4 lg:p-6 overflow-hidden transition-all duration-700 ease-out hover:rotate-0 hover:scale-[1.02] cursor-pointer"
              onClick={handleLoadDemo}
            >
              {/* Mockup Top Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3.5 mb-4">
                {/* Mockup Logo */}
                <div className="flex items-center gap-2.5">
                  <img src={symbolLogo} alt="Logo Emblem" className="w-7 h-7 object-contain" />
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 leading-none">
                      CYBER<span className="text-emerald-600">FRAUD</span>
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">TRAIL ANALYZER</p>
                  </div>
                </div>

                {/* Control Icons */}
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-800">
                    <Search className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-800">
                    <ZoomIn className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-800">
                    <ZoomOut className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-800">
                    <Maximize2 className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Mockup Card Content Grid (Sidebar + Graph Canvas) */}
              <div className="flex items-stretch gap-4">
                {/* Interior Icon Navigation Sidebar */}
                <div className="flex flex-col items-center gap-3.5 pr-3 border-r border-slate-100 dark:border-slate-700/60 py-1">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 shadow-2xs">
                    <HomeIcon className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg text-slate-400 flex items-center justify-center hover:text-slate-600">
                    <ReceiptText className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg text-slate-400 flex items-center justify-center hover:text-slate-600">
                    <Network className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg text-slate-400 flex items-center justify-center hover:text-slate-600">
                    <FileSearch className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg text-slate-400 flex items-center justify-center hover:text-slate-600">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </div>

                {/* Right Interior Graph View */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50/40 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/40 p-3">
                  {/* L0 Victim Node */}
                  <div className="w-full flex justify-center">
                    <div className="px-4 py-2.5 rounded-2xl bg-[#FFF5F5] border border-[#FCA5A5] text-slate-800 shadow-2xs flex items-center gap-2.5 min-w-[190px]">
                      <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                        <UserRound className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-red-600 uppercase tracking-wide">L0 • VICTIM ACCOUNT</p>
                        <p className="font-mono text-xs font-black text-slate-900">XXXX1234</p>
                        <p className="text-[9px] text-slate-500 truncate">State Bank of India • ₹ 24,50,000</p>
                      </div>
                    </div>
                  </div>

                  {/* Branching SVG Tree Connector L0 -> L1 */}
                  <svg className="w-full h-6 overflow-visible shrink-0" viewBox="0 0 300 24" fill="none">
                    <path d="M 150 0 L 150 10" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M 50 10 L 250 10" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M 50 10 L 50 24" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M 150 10 L 150 24" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M 250 10 L 250 24" stroke="#10b981" strokeWidth="1.8" />
                    <circle cx="50" cy="22" r="2.5" fill="#10b981" />
                    <circle cx="150" cy="22" r="2.5" fill="#10b981" />
                    <circle cx="250" cy="22" r="2.5" fill="#10b981" />
                  </svg>

                  {/* L1 Nodes */}
                  <div className="w-full grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] shadow-2xs flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-emerald-700 truncate">XXXX5678</p>
                        <p className="text-[8px] text-slate-500 truncate">HDFC Bank</p>
                        <p className="text-[8px] font-bold text-slate-800">₹ 8,00,000</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] shadow-2xs flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-emerald-700 truncate">XXXX9012</p>
                        <p className="text-[8px] text-slate-500 truncate">ICICI Bank</p>
                        <p className="text-[8px] font-bold text-slate-800">₹ 9,50,000</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] shadow-2xs flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-emerald-700 truncate">XXXX7890</p>
                        <p className="text-[8px] text-slate-500 truncate">Axis Bank</p>
                        <p className="text-[8px] font-bold text-slate-800">₹ 7,00,000</p>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Arrow Connectors L1 -> L2 */}
                  <svg className="w-full h-5 overflow-visible shrink-0" viewBox="0 0 300 20" fill="none">
                    <path d="M 50 0 L 50 20" stroke="#3b82f6" strokeWidth="1.8" />
                    <path d="M 150 0 L 150 20" stroke="#3b82f6" strokeWidth="1.8" />
                    <path d="M 250 0 L 250 20" stroke="#3b82f6" strokeWidth="1.8" />
                    <path d="M 47 15 L 50 20 L 53 15" stroke="#3b82f6" strokeWidth="1.8" fill="none" />
                    <path d="M 147 15 L 150 20 L 153 15" stroke="#3b82f6" strokeWidth="1.8" fill="none" />
                    <path d="M 247 15 L 250 20 L 253 15" stroke="#3b82f6" strokeWidth="1.8" fill="none" />
                  </svg>

                  {/* L2 Nodes */}
                  <div className="w-full grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] shadow-2xs flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-blue-700 truncate">XXXX3456</p>
                        <p className="text-[8px] text-slate-500 truncate">Kotak Mahindra</p>
                        <p className="text-[8px] font-bold text-slate-800">₹ 4,00,000</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] shadow-2xs flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-blue-700 truncate">XXXX1122</p>
                        <p className="text-[8px] text-slate-500 truncate">Bank of Baroda</p>
                        <p className="text-[8px] font-bold text-slate-800">₹ 5,00,000</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] shadow-2xs flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-blue-700 truncate">XXXX3344</p>
                        <p className="text-[8px] text-slate-500 truncate">Canara Bank</p>
                        <p className="text-[8px] font-bold text-slate-800">₹ 4,50,000</p>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Arrow Connectors L2 -> L3 */}
                  <svg className="w-full h-5 overflow-visible shrink-0" viewBox="0 0 300 20" fill="none">
                    <path d="M 50 0 L 50 20" stroke="#f59e0b" strokeWidth="1.8" />
                    <path d="M 150 0 L 150 20" stroke="#f59e0b" strokeWidth="1.8" />
                    <path d="M 250 0 L 250 20" stroke="#f59e0b" strokeWidth="1.8" />
                    <path d="M 47 15 L 50 20 L 53 15" stroke="#f59e0b" strokeWidth="1.8" fill="none" />
                    <path d="M 147 15 L 150 20 L 153 15" stroke="#f59e0b" strokeWidth="1.8" fill="none" />
                    <path d="M 247 15 L 250 20 L 253 15" stroke="#f59e0b" strokeWidth="1.8" fill="none" />
                  </svg>

                  {/* L3 Nodes */}
                  <div className="w-full grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] shadow-2xs flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-amber-700 truncate">XXXX5566</p>
                        <p className="text-[8px] text-slate-500 truncate">Paytm Payments</p>
                        <p className="text-[8px] font-bold text-slate-800">₹ 2,00,000</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] shadow-2xs flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-amber-700 truncate">XXXX7788</p>
                        <p className="text-[8px] text-slate-500 truncate">PhonePe</p>
                        <p className="text-[8px] font-bold text-slate-800">₹ 2,00,000</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] shadow-2xs flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-amber-700 truncate">XXXX9900</p>
                        <p className="text-[8px] text-slate-500 truncate">Razorpay</p>
                        <p className="text-[8px] font-bold text-slate-800">₹ 4,00,000</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          onClick={scrollToHowItWorks}
          className="flex flex-col items-center justify-center gap-1.5 text-slate-400 py-4 cursor-pointer hover:text-emerald-600 transition-colors animate-bounce z-10"
        >
          <div className="w-5 h-8 rounded-full border-2 border-slate-300 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-slate-400 animate-pulse" />
          </div>
          <span className="text-[11px] font-extrabold tracking-wider uppercase">Scroll to explore</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </main>

      {/* Background Flowing Mint Wave Line (Matching Target Image 1) */}
      <svg className="absolute bottom-64 left-0 right-0 w-full h-52 pointer-events-none z-0" viewBox="0 0 1440 220" fill="none">
        <path
          d="M -100 160 Q 380 40 740 160 T 1540 100"
          stroke="url(#mint-wave-gradient)"
          strokeWidth="3"
          fill="none"
        />
        <circle cx="540" cy="122" r="8" className="fill-emerald-500 stroke-white stroke-2 animate-ping" />
        <circle cx="540" cy="122" r="6" className="fill-emerald-500 stroke-white stroke-2" />
        <defs>
          <linearGradient id="mint-wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── How It Works Section ── */}
      <section id="how-it-works-section" className="py-16 px-6 lg:px-12 bg-white dark:bg-[#161b22] border-t border-slate-200/80 dark:border-slate-700/60 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Simple Workflow
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">How It Works</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Three seamless steps to transform NCRP complaint PDFs or Excel workbooks into actionable money trail graphs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-8 rounded-3xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/50 shadow-sm flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 font-black text-lg flex items-center justify-center border border-emerald-200/80 shadow-2xs">
                01
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Upload Document</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Click Upload Document to choose any official NCRP cyber fraud complaint PDF or Excel workbook (.xlsx/.xls) directly from your file manager.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/50 shadow-sm flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-700 font-black text-lg flex items-center justify-center border border-blue-200/80 shadow-2xs">
                02
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Auto-Extract &amp; Layer Analysis</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                The pipeline extracts transactions, validates UTR/RRN numbers, normalizes amounts, and categorizes accounts into Victim (L0), Mule (L1-L3), and Cash-Out layers.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/50 shadow-sm flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 font-black text-lg flex items-center justify-center border border-amber-200/80 shadow-2xs">
                03
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Trace Money Trail &amp; Export</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Explore the interactive network in Reveal Mode, filter transactions, generate evidence summaries, and export high-res PNGs or court-ready PDF case reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white dark:bg-[#161b22] border-t border-slate-200/80 dark:border-slate-700/60 py-8 px-6 lg:px-12 text-xs text-slate-500 dark:text-slate-400 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={symbolLogo} alt="CyberTrail Symbol" className="w-6 h-6 object-contain" />
            <span className="font-extrabold text-slate-800 dark:text-slate-200">CyberTrail</span>
            <span className="text-slate-300">|</span>
            <span>Money Trail Analyzer</span>
          </div>
          <p className="text-center sm:text-right text-[11px] text-slate-400">
            Authorized Personnel Only • Temporary Session Data • Zero Retention Guarantee
          </p>
        </div>
      </footer>
    </div>
  )
}
