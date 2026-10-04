// src/pages/UploadPage.tsx
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, AlertCircle, CheckCircle2, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAnalysis } from '@/contexts/AnalysisContext'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export function UploadPage() {
  const navigate = useNavigate()
  const { setAnalysis, clearAnalysis } = useAnalysis()

  const [file, setFile] = useState<File | null>(null)
  const [estimatedPages, setEstimatedPages] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)


  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null)

    if (fileRejections.length > 0) {
      const rej = fileRejections[0]
      if (rej.file.size > MAX_FILE_SIZE_BYTES) {
        setError('File size exceeds the 50 MB limit. Please upload a smaller document.')
      } else {
        setError('Invalid file type. Only PDF (.pdf) and Excel (.xlsx, .xls) documents are supported.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const selected = acceptedFiles[0]
      const fn = selected.name.toLowerCase()
      if (!fn.endsWith('.pdf') && !fn.endsWith('.xlsx') && !fn.endsWith('.xls')) {
        setError('Only PDF and Excel files (.pdf, .xlsx, .xls) are permitted.')
        return
      }
      setFile(selected)
      const approxPages = Math.max(1, Math.round(selected.size / (60 * 1024)))
      setEstimatedPages(approxPages)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
  })

  async function handleStartAnalysis(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Please select a complaint PDF or Excel document to upload.')
      return
    }

    setError(null)
    setUploading(true)
    clearAnalysis()

    try {
      const formData = new FormData()
      formData.append('file', file)

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
      const message = err instanceof TypeError
        ? 'The analysis service is unavailable. Start FastAPI on http://localhost:8000 and try again.'
        : err.message || 'Unable to process the uploaded document.'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 py-2">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Upload Complaint Document or Excel</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Upload an official NCRP cyber fraud complaint PDF or Excel workbook to automatically parse transactions and build money trails.
          </p>
        </div>
      </div>

      <form onSubmit={handleStartAnalysis} className="flex flex-col gap-5">

        {/* ── Error Alert ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* ── Dropzone ── */}
        <div
          {...getRootProps()}
          className={`rounded-2xl border-2 border-dashed p-14 flex flex-col items-center justify-center gap-4 text-center transition-all cursor-pointer bg-white shadow-xs ${
            isDragActive
              ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-500/10'
              : file
              ? 'border-emerald-400 bg-emerald-50/30'
              : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/20'
          }`}
        >
          <input {...getInputProps()} />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Size: <span className="text-slate-700 font-mono font-semibold">{formatFileSize(file.size)}</span>
                  {file.name.toLowerCase().endsWith('.pdf') && estimatedPages && (
                    <> • Est. Pages: <span className="text-slate-700 font-mono font-semibold">~{estimatedPages}</span></>
                  )}
                </p>
              </div>
              <p className="text-sm text-emerald-600 hover:underline font-medium">Click or drag a new file to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-800">
                  {isDragActive ? 'Drop the file here…' : 'Drag & drop your PDF or Excel file here, or click to browse'}
                </p>
                <p className="text-sm text-slate-500 mt-1">Supports official NCRP Complaint PDFs &amp; Excel Workbooks (.pdf, .xlsx, .xls) (max 50 MB)</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Security & Action Bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2.5 text-sm text-slate-600">
            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span>Processed in temporary memory only. Nothing is saved to a database or browser storage.</span>
          </div>

          <button
            id="start-analysis-btn"
            type="submit"
            disabled={uploading || !file}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading &amp; Initializing…
              </>
            ) : (
              <>
                Start Analysis
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
