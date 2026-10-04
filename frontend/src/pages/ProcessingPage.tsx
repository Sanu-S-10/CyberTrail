import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAnalysis } from '@/contexts/AnalysisContext'

const PIPELINE_STAGES = [
  { id: 'UPLOADING', label: 'PDF Document Upload', desc: 'Validating the PDF in temporary request memory' },
  { id: 'EXTRACTING', label: 'PDF Section & Table Extraction', desc: 'Scanning PDF tables using the existing extraction pipeline' },
  { id: 'OCR', label: 'OCR Fallback Scanning', desc: 'Running per-page OCR on scanned pages' },
  { id: 'PARSING', label: 'Transaction Parsing', desc: 'Structuring transfers, ATM, POS, and cash records' },
  { id: 'NORMALIZING', label: 'Data Normalization', desc: 'Standardizing dates, amounts, and IFSC codes' },
  { id: 'LAYER_ANALYSIS', label: 'Layer Graph Traversal', desc: 'Computing money-flow layers and source pages' },
  { id: 'COMPLETED', label: 'Money Trail Graph Construction', desc: 'Building the Full View and Reveal Mode graph' },
]

export function ProcessingPage() {
  const { id } = useParams()
  const caseId = id || 'temporary'
  const navigate = useNavigate()
  const { analysis } = useAnalysis()
  const [currentStageIndex, setCurrentStageIndex] = useState(0)

  useEffect(() => {
    if (!analysis || analysis.analysis_id !== caseId) navigate('/cases/upload', { replace: true })
  }, [analysis, caseId, navigate])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStageIndex((previous) => {
        if (previous >= PIPELINE_STAGES.length - 1) {
          clearInterval(interval)
          return previous
        }
        return previous + 1
      })
    }, 600)
    return () => clearInterval(interval)
  }, [])

  const currentStage = PIPELINE_STAGES[currentStageIndex]
  const isFinished = currentStageIndex >= PIPELINE_STAGES.length - 1
  const progressPercent = isFinished ? 100 : Math.round(((currentStageIndex + 1) / PIPELINE_STAGES.length) * 100)

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 py-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Processing PDF</h1>
          <span className="text-2xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
            {caseId}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Temporary session: <span className="font-mono text-slate-700 font-bold">{analysis?.analysis_id}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-6">
        {/* Progress Bar Header */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-800 flex items-center gap-2">
              {!isFinished ? (
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              {isFinished ? 'Processing Complete' : currentStage.label}
            </span>
            <span className="font-mono font-black text-emerald-600">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stage List */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          {PIPELINE_STAGES.map((stage, index) => {
            const isDone = index < currentStageIndex || (isFinished && index === currentStageIndex)
            const isCurrent = index === currentStageIndex && !isFinished
            return (
              <div
                key={stage.id}
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : isCurrent
                    ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500/20'
                    : 'border-slate-100 bg-slate-50/50 opacity-60'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4.5 h-4.5 mt-0.5 text-emerald-500 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4.5 h-4.5 mt-0.5 text-emerald-600 animate-spin shrink-0" />
                ) : (
                  <span className="w-4.5 h-4.5 mt-0.5 rounded-full border border-slate-300 text-[10px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900">{stage.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{stage.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Button on Finish */}
        {isFinished && (
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => navigate(`/cases/${caseId}/money-trail`)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-xs transition-all"
            >
              View Money Trail Graph
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
