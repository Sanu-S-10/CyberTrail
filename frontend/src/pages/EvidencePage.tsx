// src/pages/EvidencePage.tsx
import { FileText, FileSearch, ShieldCheck, CheckCircle2, Layers } from 'lucide-react'
import { useAnalysis } from '@/contexts/AnalysisContext'

export function EvidencePage() {
  const { analysis } = useAnalysis()
  const pages = analysis?.pages?.page_count || 0
  const sections = analysis?.sections || []

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto py-2">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
          <FileSearch className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Source-Page Verification & Evidence
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verify extracted transactions and section metadata against the temporary analysis session.
          </p>
        </div>
      </div>

      {/* ── Active PDF Document Details ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#161b22] p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Active Document Metadata</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-extrabold border-b border-slate-200 dark:border-slate-700/60">
              <tr>
                <th className="p-3.5">File Name</th>
                <th className="p-3.5">Session ID</th>
                <th className="p-3.5">Document Type</th>
                <th className="p-3.5">Total Pages</th>
                <th className="p-3.5">Retention</th>
                <th className="p-3.5 text-right">Session Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {analysis?.case?.file_name || 'No active document'}
                </td>
                <td className="p-3.5 font-mono font-bold text-slate-500 dark:text-slate-400">{analysis?.analysis_id || 'No active session'}</td>
                <td className="p-3.5 font-mono text-[11px] uppercase text-slate-600 dark:text-slate-400">
                  {analysis?.case?.document_type ? `${analysis.case.document_type} Document` : 'PDF Document'}
                </td>
                <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300 font-bold">{pages}</td>
                <td className="p-3.5 text-slate-500 dark:text-slate-400 font-medium">Temporary memory</td>
                <td className="p-3.5 text-right">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    SESSION ACTIVE
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Extracted Sections Breakdown ── */}
      {sections.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#161b22] p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
              <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Detected Document Sections</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map((sec: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{sec.section_name || sec.title || `Section ${idx + 1}`}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Page {sec.page_number || sec.page || '1'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

