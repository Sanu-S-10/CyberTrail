// src/pages/TransactionExplorerPage.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Upload, ReceiptText } from 'lucide-react'
import { useAnalysis } from '@/contexts/AnalysisContext'

// Same palette as MoneyTrailPage
const LAYER_EDGE_COLORS = [
  '#10B981', // L1 emerald
  '#3B82F6', // L2 blue
  '#F59E0B', // L3 amber
  '#8B5CF6', // L4 purple
  '#D946EF', // L5 fuchsia
  '#14B8A6', // L6 teal
  '#6366F1', // L7 indigo
  '#F97316', // L8 orange
  '#22C55E', // L9 green
  '#F43F5E', // L10 rose
  '#0EA5E9', // L11 sky
  '#06B6D4', // L12 cyan
]

function layerColor(layer: number | null) {
  if (layer === null || layer === 0) return '#94A3B8'
  const l = Math.max(layer, 1)
  return LAYER_EDGE_COLORS[(l - 1) % LAYER_EDGE_COLORS.length]
}

const TYPE_LABEL: Record<string, string> = {
  ACCOUNT_TRANSFER: 'Account Transfer',
  WALLET_TRANSFER: 'Wallet Transfer',
  ATM_WITHDRAWAL: 'ATM Withdrawal',
  POS_WITHDRAWAL: 'POS Purchase',
  CASH_WITHDRAWAL: 'Cash Withdrawal',
  AEPS_WITHDRAWAL: 'AEPS Withdrawal',
  WITHDRAWAL: 'Withdrawal Event',
}

export function TransactionExplorerPage() {
  const { analysis } = useAnalysis()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [layerFilter, setLayerFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  const transactionData = useMemo(() => {
    if (!analysis) return []
    const transfers = (analysis.transactions || []).map((tx: any) => ({
      id: tx.id,
      date: tx.transaction_date || tx.raw_date || '—',
      from: tx.from_account_number || tx.from_account_id || '—',
      to: tx.to_account_number || tx.to_account_id || '—',
      bank: tx.bank_name || tx.destination_bank || '—',
      amount: Number(tx.amount || 0),
      type: tx.transaction_type || 'ACCOUNT_TRANSFER',
      layer: tx.layer === null || tx.layer === undefined ? null : Number(tx.layer),
      utr: tx.utr_rrn || tx.transaction_id || '—',
    }))
    const withdrawals = (analysis.withdrawals || []).map((w: any) => ({
      id: w.id,
      date: w.date || w.raw_date || '—',
      from: w.account_number || '—',
      to: w.location || w.withdrawal_type || 'WITHDRAWAL',
      bank: w.bank_name || '—',
      amount: Number(w.amount || 0),
      type: w.withdrawal_type || 'WITHDRAWAL',
      layer: w.layer === null || w.layer === undefined ? null : Number(w.layer),
      utr: w.utr_rrn || '—',
    }))
    return [...transfers, ...withdrawals]
  }, [analysis])

  // Layers come from the analysed document's own layer values only
  const officialLayers = (analysis?.graph as any)?.document_layers as number[] | undefined
  const allLayers = useMemo(() => {
    if (Array.isArray(officialLayers) && officialLayers.length > 0) {
      return [...officialLayers].map(Number).sort((a, b) => a - b)
    }
    const set = new Set<number>(transactionData.map((t) => t.layer).filter((value): value is number => typeof value === 'number' && value > 0))
    return [...set].sort((a, b) => a - b)
  }, [transactionData, officialLayers])
  const maxOfficialLayer = allLayers.length ? allLayers[allLayers.length - 1] : 0
  const unstatedLayerCount = transactionData.filter((t) => t.layer === null).length

  const filtered = useMemo(() => {
    return transactionData.filter((tx) => {
      if (layerFilter === 'VICTIM' && tx.layer !== 0) return false
      if (layerFilter === 'UNSTATED' && tx.layer !== null) return false
      if (layerFilter !== 'ALL' && layerFilter !== 'VICTIM' && layerFilter !== 'UNSTATED' && tx.layer !== parseInt(layerFilter)) return false
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        return (
          String(tx.from).toLowerCase().includes(q) ||
          String(tx.to).toLowerCase().includes(q) ||
          String(tx.bank).toLowerCase().includes(q) ||
          String(tx.utr).toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [query, layerFilter, typeFilter, transactionData])

  function escapeCSVValue(value: unknown): string {
    const text = value === null || value === undefined ? '' : String(value)
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  function exportCSV() {
    const headers = ['Date', 'From Account', 'To Account', 'Bank', 'Amount', 'Type', 'NCRP Layer', 'UTR / Reference']
    const rows = filtered.map((t) => [
      escapeCSVValue(t.date),
      escapeCSVValue(t.from),
      escapeCSVValue(t.to),
      escapeCSVValue(t.bank),
      escapeCSVValue(t.amount),
      escapeCSVValue(t.type),
      escapeCSVValue(t.type === 'ACCOUNT_TRANSFER' ? (t.layer === null || t.layer === 0 ? 'Victim / Origin' : `Layer ${t.layer}`) : 'Withdrawal (no layer)'),
      escapeCSVValue(t.utr),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 py-1">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ReceiptText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Transaction Explorer</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Search, filter, and export transaction data across all layers of complaint cases.
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          disabled={!analysis || filtered.length === 0}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40"
        >
          <Download className="h-4 w-4 text-slate-500" />
          Export CSV ({filtered.length})
        </button>
      </div>

      {/* ── Search & Filters ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Account No, Bank Name, or UTR/RRN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>

        <select
          value={layerFilter}
          onChange={(e) => setLayerFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
        >
          <option value="ALL">
            All NCRP Layers{allLayers.length ? ` (Layer 1–Layer ${maxOfficialLayer})` : ''}
          </option>
          <option value="VICTIM">Victim / Origin</option>
          {allLayers.map((l) => (
            <option key={l} value={String(l)}>Layer {l}</option>
          ))}
          {unstatedLayerCount > 0 && (
            <option value="UNSTATED">Not stated in source ({unstatedLayerCount})</option>
          )}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
        >
          <option value="ALL">All Types</option>
          <option value="ACCOUNT_TRANSFER">Account Transfer</option>
          <option value="WALLET_TRANSFER">Wallet Transfer</option>
          <option value="ATM_WITHDRAWAL">ATM Withdrawal</option>
          <option value="POS_WITHDRAWAL">POS Purchase</option>
          <option value="CHEQUE_WITHDRAWAL">Cheque Withdrawal</option>
          <option value="AEPS_WITHDRAWAL">AEPS Withdrawal</option>
          <option value="CASH_WITHDRAWAL">Cash Withdrawal</option>
        </select>
      </div>

      {/* ── Table ── */}
      {!analysis ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 shadow-xs text-center flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ReceiptText className="h-7 w-7" />
          </div>
          <p className="text-base font-bold text-slate-900">No analysis loaded</p>
          <p className="text-sm text-slate-500">Upload a PDF or Excel document to populate the transaction explorer.</p>
          <button
            onClick={() => navigate('/cases/upload')}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 shadow-xs transition-colors"
          >
            <Upload className="h-4 w-4" /> Upload Document
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-10 shadow-xs text-center">
          <p className="text-sm text-slate-500">No transactions match your filters.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              {/* Header */}
              <thead className="border-b border-slate-200 bg-slate-50/70">
                <tr className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 w-12">#</th>
                  <th className="px-5 py-4 min-w-[155px]">Date &amp; Time</th>
                  <th className="px-5 py-4 min-w-[155px]">From Account</th>
                  <th className="px-5 py-4 min-w-[155px]">To Account</th>
                  <th className="px-5 py-4 min-w-[155px]">Bank Name</th>
                  <th className="px-5 py-4 min-w-[110px]">Amount</th>
                  <th className="px-5 py-4 min-w-[155px]">Type</th>
                  <th className="px-5 py-4 w-24">Layer</th>
                  <th className="px-5 py-4 min-w-[185px]">UTR / RRN</th>
                </tr>
              </thead>

              {/* Rows */}
              <tbody className="divide-y divide-slate-100">
                {filtered.map((tx, idx) => {
                  const lColor = layerColor(tx.layer)
                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-emerald-50/30">
                      <td className="px-5 py-4 text-sm font-mono text-slate-400">{idx + 1}</td>

                      <td className="px-5 py-4 text-sm font-medium whitespace-nowrap text-slate-600">
                        {tx.date}
                      </td>

                      <td className="px-5 py-4 text-sm font-mono font-bold text-slate-700">
                        {tx.from}
                      </td>

                      <td className="px-5 py-4 text-sm font-mono font-bold text-slate-900">
                        {tx.to}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">{tx.bank}</td>

                      <td className="px-5 py-4 text-sm font-black text-emerald-600 whitespace-nowrap">
                        ₹{tx.amount.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 whitespace-nowrap">
                          {TYPE_LABEL[tx.type] || tx.type.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-black"
                          style={{
                            backgroundColor: `${lColor}18`,
                            color: lColor,
                            border: `1px solid ${lColor}40`,
                          }}
                        >
                          {tx.type === 'ACCOUNT_TRANSFER'
                            ? tx.layer === null
                              ? 'Not stated'
                              : tx.layer === 0
                                ? 'Victim / Origin'
                                : `Layer ${tx.layer}`
                            : 'Withdrawal'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-mono text-slate-500">{tx.utr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Showing{' '}
              <span className="font-black text-slate-800">{filtered.length}</span>
              {' '}of{' '}
              <span className="font-black text-slate-800">{transactionData.length}</span>
              {' '}transactions
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
