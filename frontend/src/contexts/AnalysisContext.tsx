import { createContext, useContext, useState, type ReactNode } from 'react'

export interface WithdrawalEvent {
  id: string
  account_id: string
  account_number: string
  withdrawal_type: string
  amount: number
  raw_amount: string
  date: string
  bank_name: string
  utr_rrn: string
  location: string
  remarks: string
  sheet_name?: string
  layer?: number | null
}

export interface AnalysisResult {
  analysis_id: string
  expires_in_seconds: number
  demo_data: boolean
  extraction_note?: string
  case: Record<string, any>
  accounts: Record<string, any>[]
  transactions: Record<string, any>[]
  withdrawals?: WithdrawalEvent[]
  graph: { nodes: Record<string, any>[]; edges: Record<string, any>[] }
  layers: number[]
  pages: Record<string, any>
  sections: Record<string, any>[]
}

interface AnalysisContextValue {
  analysis: AnalysisResult | null
  setAnalysis: (analysis: AnalysisResult) => void
  clearAnalysis: () => void
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null)

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  return (
    <AnalysisContext.Provider value={{ analysis, setAnalysis, clearAnalysis: () => setAnalysis(null) }}>
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  const context = useContext(AnalysisContext)
  if (!context) throw new Error('useAnalysis must be used inside AnalysisProvider')
  return context
}
