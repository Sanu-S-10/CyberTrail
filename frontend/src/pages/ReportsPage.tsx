// src/pages/ReportsPage.tsx
import { useEffect, useRef, useState } from 'react'
import {
  BarChart3, Download, FileText, Loader2, AlertTriangle,
  ShieldCheck, Layers, Users, ReceiptText, Network, Upload, Landmark,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '@/contexts/AnalysisContext'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

/* ─── Palette (matches MoneyTrailPage) ─── */
const LAYER_EDGE_COLORS = [
  '#10B981','#3B82F6','#F59E0B','#8B5CF6','#D946EF',
  '#14B8A6','#6366F1','#F97316','#22C55E','#F43F5E',
  '#0EA5E9','#06B6D4',
]
const LAYER_PALETTE = [
  { bg: '#ECFDF5', text: '#059669' },
  { bg: '#EFF6FF', text: '#2563EB' },
  { bg: '#FFFBEB', text: '#D97706' },
  { bg: '#F5F3FF', text: '#7C3AED' },
  { bg: '#FDF2F8', text: '#C026D3' },
  { bg: '#F0FDFA', text: '#0D9488' },
  { bg: '#EEF2FF', text: '#4F46E5' },
  { bg: '#FFF7ED', text: '#EA580C' },
  { bg: '#F0FDF4', text: '#16A34A' },
  { bg: '#FEF2F2', text: '#DC2626' },
  { bg: '#F0F9FF', text: '#0284C7' },
  { bg: '#ECFEFF', text: '#0891B2' },
]

function lColor(layer: number) {
  return LAYER_EDGE_COLORS[(Math.max(layer, 1) - 1) % LAYER_EDGE_COLORS.length]
}
function lPal(layer: number) {
  return LAYER_PALETTE[(Math.max(layer, 1) - 1) % LAYER_PALETTE.length]
}
function fmtCurrency(n: number) {
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* ─── PDF Table Helpers ─── */
type Cell = { text: string; bold?: boolean; align?: 'left'|'right'|'center'; color?: string }

function drawThead(pdf: jsPDF, cols: {label:string;w:number}[], x: number, y: number, bgHex: string) {
  const H = 8
  pdf.setFillColor(bgHex)
  pdf.rect(x, y, cols.reduce((s,c)=>s+c.w,0), H, 'F')
  pdf.setFont('helvetica','bold'); pdf.setFontSize(6.5); pdf.setTextColor('#ffffff')
  let cx = x
  cols.forEach(c => { pdf.text(c.label, cx+2, y+5.5); cx+=c.w })
  return y + H
}

function drawTrow(pdf: jsPDF, cols: {w:number}[], cells: Cell[], x: number, y: number, even: boolean) {
  const H = 7
  if (even) { pdf.setFillColor('#f8fafc'); pdf.rect(x, y, cols.reduce((s,c)=>s+c.w,0), H, 'F') }
  pdf.setLineWidth(0.15); pdf.setDrawColor('#e2e8f0')
  pdf.line(x, y+H, x+cols.reduce((s,c)=>s+c.w,0), y+H)
  let cx = x
  cells.forEach((cell,i) => {
    const col = cols[i]
    if (!col) return
    pdf.setFont('helvetica', cell.bold ? 'bold' : 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(cell.color||'#1e293b')
    const align = cell.align||'left'
    const tx = align==='right' ? cx+col.w-2 : cx+2
    // Clip text to column width
    const maxChars = Math.floor(col.w / 1.8)
    const txt = (cell.text||'—').length > maxChars ? (cell.text||'—').slice(0,maxChars-1)+'…' : (cell.text||'—')
    pdf.text(txt, tx, y+5, { align })
    cx += col.w
  })
  return y + H
}

/* ─── Build a plain HTML graph image from nodes/edges ─── */
function buildGraphCanvas(nodes: any[], edges: any[]): HTMLCanvasElement {
  const W = 900, H = 380
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0,0,W,H)

  // Group nodes by layer
  const byLayer: Record<number, any[]> = {}
  nodes.forEach(n => {
    const l = n.data?.layer ?? n.raw?.layer ?? 0
    if (!byLayer[l]) byLayer[l] = []
    byLayer[l].push(n)
  })
  const layerNums = Object.keys(byLayer).map(Number).sort((a,b)=>a-b)
  const positions: Record<string, {x:number;y:number}> = {}

  // Compute positions
  const layerH = Math.min(340 / Math.max(layerNums.length, 1), 90)
  layerNums.forEach((l, li) => {
    const nodesInLayer = byLayer[l]
    nodesInLayer.forEach((n, ni) => {
      const colW = W / (nodesInLayer.length + 1)
      positions[n.id] = {
        x: colW * (ni + 1),
        y: 30 + li * layerH + layerH/2,
      }
    })
  })

  // Draw edges
  edges.forEach(e => {
    const from = positions[e.source]
    const to = positions[e.target]
    if (!from || !to) return
    ctx.beginPath()
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7
    ctx.moveTo(from.x, from.y)
    ctx.bezierCurveTo(from.x, from.y+30, to.x, to.y-30, to.x, to.y)
    ctx.stroke(); ctx.globalAlpha = 1

    // Arrowhead
    const angle = Math.atan2(to.y - (to.y-30), to.x - to.x)
    ctx.beginPath(); ctx.fillStyle = '#10b981'
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(to.x - 7*Math.cos(angle-0.4), to.y - 7*Math.sin(angle-0.4))
    ctx.lineTo(to.x - 7*Math.cos(angle+0.4), to.y - 7*Math.sin(angle+0.4))
    ctx.closePath(); ctx.fill()
  })

  // Draw nodes
  nodes.forEach(n => {
    const pos = positions[n.id]
    if (!pos) return
    const layer = n.data?.layer ?? 0
    const pal = layer === 0 ? { bg: '#FEF2F2', text: '#DC2626' } : lPal(layer)
    const label = n.data?.label || n.id || ''
    const nW = 110, nH = 32
    const nx = pos.x - nW/2, ny = pos.y - nH/2

    // Box
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = pal.text; ctx.lineWidth = 1.5
    roundRect(ctx, nx, ny, nW, nH, 8); ctx.fill(); ctx.stroke()

    // Layer dot
    ctx.fillStyle = pal.text
    ctx.beginPath(); ctx.arc(nx+10, ny+nH/2, 4, 0, Math.PI*2); ctx.fill()

    // Label
    ctx.fillStyle = '#0f172a'; ctx.font = 'bold 7px Arial'
    const labelTxt = label.toString().length > 14 ? label.toString().slice(0,14)+'…' : label.toString()
    ctx.fillText(labelTxt, nx+18, ny+12)

    // Sub-label (layer)
    ctx.fillStyle = pal.text; ctx.font = '6px Arial'
    ctx.fillText(`L${layer}`, nx+18, ny+22)
  })

  return canvas
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r, y)
  ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r)
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h)
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r)
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y)
  ctx.closePath()
}

/* ─────────────── PDF Generator ─────────────── */
async function generateFullPDF(analysis: any, graphDataUrl: string | null) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210, PH = 297, ML = 14, MR = 14, CW = PW - ML - MR
  const caseData = analysis.case || {}
  const accounts: any[] = analysis.accounts || []
  const transactions: any[] = analysis.transactions || []
  const layers: number[] = analysis.layers || []
  const maxLayer = layers.length > 0 ? Math.max(...layers) : 0

  let y = 0

  function checkBreak(need = 20) {
    if (y + need > PH - 14) { pdf.addPage(); y = 14 }
  }

  function sectionBar(title: string, num: string) {
    checkBreak(16)
    pdf.setFillColor('#0f172a')
    pdf.rect(ML, y, CW, 9, 'F')
    // Left accent stripe
    pdf.setFillColor('#10b981')
    pdf.rect(ML, y, 3, 9, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor('#ffffff')
    pdf.text(`${num}. ${title}`, ML + 6, y + 6.2)
    y += 13
  }

  /* ── COVER ── */
  // Dark top band
  pdf.setFillColor('#0f172a')
  pdf.rect(0, 0, PW, 44, 'F')
  // Green accent bar
  pdf.setFillColor('#10b981')
  pdf.rect(0, 40, PW, 4, 'F')
  // Left green stripe
  pdf.setFillColor('#10b981')
  pdf.rect(0, 0, 5, 44, 'F')

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor('#ffffff')
  pdf.text('CYBER FINANCIAL FRAUD', 14, 14)
  pdf.text('TRANSACTION TRAIL ANALYSIS REPORT', 14, 24)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor('#94a3b8')
  pdf.text(
    `Report ID: ${analysis.analysis_id || 'N/A'}   |   Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
    14, 34,
  )

  // CONFIDENTIAL red badge (top-right)
  pdf.setFillColor('#ef4444')
  pdf.roundedRect(PW - 50, 6, 36, 10, 2, 2, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor('#ffffff')
  pdf.text('CONFIDENTIAL', PW - 43, 12.8)

  y = 52

  /* ── SECTION 1: Case & Victim Details ── */
  sectionBar('Case & Victim Details', '1')

  // Victim name — search all possible fields
  const victimName =
    caseData.victim_name ||
    caseData.victimName ||
    accounts.find((a: any) => a.layer === 0)?.holder_name ||
    '—'
  const victimAcc = caseData.victim_account || caseData.victimAccount ||
    accounts.find((a: any) => a.layer === 0)?.account_number || '—'
  const victimBank = caseData.victim_bank || caseData.victimBank ||
    accounts.find((a: any) => a.layer === 0)?.bank_name || '—'
  const fraudAmt = (caseData.reported_fraud_amount ?? caseData.total_fraud_amount)
    ? fmtCurrency(parseFloat(caseData.reported_fraud_amount ?? caseData.total_fraud_amount)) : '—'


  const caseNo = caseData.case_number || '—'
  const ackNo = caseData.acknowledgement_no || '—'
  const fileName = caseData.file_name || '—'

  // KV grid
  const kv = [
    ['Case Number', caseNo],
    ['NCRP Acknowledgement No.', ackNo],
    ['Victim Name', victimName],
    ['Victim Account No.', victimAcc],
    ['Victim Bank', victimBank],
    ['Source File', fileName],
  ]
  const half = CW / 2 - 3
  kv.forEach(([label, val], i) => {
    const ox = i % 2 === 0 ? 0 : half + 6
    const row = Math.floor(i / 2)
    const ky = y + row * 13
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor('#64748b')
    pdf.text(label, ML + ox, ky)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor('#0f172a')
    const displayVal = val.length > 38 ? val.slice(0, 38) + '…' : val
    pdf.text(displayVal, ML + ox, ky + 5.5)
  })
  y += Math.ceil(kv.length / 2) * 13 + 4

  // Summary boxes row
  const boxW = (CW - 3) / 4
  const summaryBoxes = [
    { label: 'REPORTED FRAUD AMOUNT', val: caseData.reported_fraud_amount ? fmtCurrency(parseFloat(caseData.reported_fraud_amount)) : '—', textC: '#dc2626', bg: '#FEF2F2', border: '#FECACA' },
    { label: 'TOTAL DISPUTED AMOUNT', val: caseData.total_disputed_amount ? fmtCurrency(parseFloat(caseData.total_disputed_amount)) : fraudAmt, textC: '#d97706', bg: '#FFFBEB', border: '#FDE68A' },
    { label: 'TRANSFER ACCOUNTS', val: `${caseData.total_transfer_accounts ?? accounts.filter((a:any) => a.account_type !== 'ATM' && a.account_type !== 'POS' && a.account_type !== 'CASH').length}`, textC: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    { label: 'WITHDRAWAL EVENTS', val: `${caseData.withdrawal_event_count ?? (analysis?.withdrawals?.length ?? 0)}`, textC: '#7c3aed', bg: '#F5F3FF', border: '#DDD6FE' },
    { label: 'TOTAL TRANSACTIONS', val: `${transactions.length}`, textC: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    { label: 'MAX LAYER DEPTH', val: `Layer ${maxLayer}`, textC: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  ]
  summaryBoxes.forEach((box, i) => {
    const bx = ML + i * (boxW + 1)
    pdf.setFillColor(box.bg); pdf.roundedRect(bx, y, boxW, 18, 2, 2, 'F')
    pdf.setDrawColor(box.border); pdf.setLineWidth(0.5)
    pdf.roundedRect(bx, y, boxW, 18, 2, 2, 'S')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(5.5); pdf.setTextColor('#64748b')
    pdf.text(box.label, bx + boxW/2, y + 6, { align: 'center' })
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(box.val.length > 12 ? 7 : 9); pdf.setTextColor(box.textC)
    pdf.text(box.val, bx + boxW/2, y + 14.5, { align: 'center' })
  })
  y += 22

  /* ── SECTION 2: Money Trail Graph ── */
  sectionBar('Money Trail Visual Graph', '2')
  if (graphDataUrl) {
    const imgH = 80
    // Graph box border
    pdf.setDrawColor('#e2e8f0'); pdf.setLineWidth(0.4)
    pdf.rect(ML, y, CW, imgH, 'S')
    pdf.addImage(graphDataUrl, 'PNG', ML, y, CW, imgH)
    y += imgH + 6
  } else {
    // Placeholder when no graph data
    pdf.setFillColor('#f8fafc'); pdf.rect(ML, y, CW, 25, 'F')
    pdf.setDrawColor('#e2e8f0'); pdf.rect(ML, y, CW, 25, 'S')
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor('#94a3b8')
    pdf.text('No graph data available. Upload a PDF with transaction data to see the money trail map.', ML + CW/2, y + 14, { align: 'center' })
    y += 30
  }

  /* ── SECTION 3: Layer-wise Account Summary ── */
  sectionBar('Layer-wise Account Summary', '3')

  const accByLayer: Record<number, any[]> = {}
  accounts.forEach((a: any) => {
    const l = a.layer ?? -1
    if (!accByLayer[l]) accByLayer[l] = []
    accByLayer[l].push(a)
  })

  for (const ln of Object.keys(accByLayer).map(Number).sort((a,b)=>a-b)) {
    const accs = accByLayer[ln]
    const label = ln === 0 ? 'L0 - Victim Account' : ln < 0 ? 'Unknown Layer' : `Layer ${ln} (L${ln})`
    const pal = ln === 0 ? { bg: '#FEF2F2', text: '#DC2626' } : lPal(ln)

    checkBreak(22 + accs.length * 7)

    // Layer heading pill
    pdf.setFillColor(pal.bg)
    pdf.roundedRect(ML, y, CW, 8, 1, 1, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(pal.text)
    pdf.text(`  ${label}  -  ${accs.length} account(s)`, ML+3, y+5.5)
    y += 9

    const cols = [
      { label:'Account Number', w: 44 },
      { label:'Holder Name',    w: 46 },
      { label:'Bank Name',      w: 50 },
      { label:'IFSC',           w: 26 },
      { label:'Type',           w: 16 },
    ]
    y = drawThead(pdf, cols, ML, y, '#334155')
    accs.forEach((a, i) => {
      checkBreak(8)
      y = drawTrow(pdf, cols, [
        { text: a.account_number||'—', bold:true, color:'#0f172a' },
        { text: a.holder_name||'—',    color:'#334155' },
        { text: a.bank_name||'—',      color:'#334155' },
        { text: a.ifsc||'—',           color:'#64748b' },
        { text: a.account_type||'—',   color:'#64748b' },
      ], ML, y, i%2===0)
    })
    y += 5
  }

  /* ── SECTION 4: Layer-wise Transaction Details ── */
  checkBreak(20)
  sectionBar('Layer-wise Transaction Details', '4')

  const txByLayer: Record<number, any[]> = {}
  transactions.forEach((tx: any) => {
    const l = tx.layer ?? -1
    if (!txByLayer[l]) txByLayer[l] = []
    txByLayer[l].push(tx)
  })

  for (const ln of Object.keys(txByLayer).map(Number).sort((a,b)=>a-b)) {
    const txs = txByLayer[ln]
    const label = ln < 0 ? 'Unknown Layer' : `Layer ${ln} (L${ln})`
    const pal = ln === 0 ? { bg: '#FEF2F2', text: '#DC2626' } : lPal(ln)
    const total = txs.reduce((s:number, t:any) => s + parseFloat(t.amount||0), 0)

    checkBreak(26 + Math.min(txs.length, 3) * 7)

    pdf.setFillColor(pal.bg); pdf.roundedRect(ML, y, CW, 9, 1, 1, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(pal.text)
    pdf.text(`  ${label}  -  ${txs.length} transaction(s)   |   Total: ${fmtCurrency(total)}`, ML+3, y+6)
    y += 10

    const cols = [
      { label:'#',            w: 9  },
      { label:'Date',         w: 27 },
      { label:'From Account', w: 34 },
      { label:'To Account',   w: 34 },
      { label:'Bank',         w: 34 },
      { label:'Amount (Rs.)', w: 27 },
      { label:'Type',         w: 17 },
    ]
    y = drawThead(pdf, cols, ML, y, '#1e293b')
    txs.forEach((tx, i) => {
      checkBreak(9)
      const amt = parseFloat(tx.amount||0)
      y = drawTrow(pdf, cols, [
        { text: String(i+1),                          align:'right', color:'#94a3b8' },
        { text: String(tx.transaction_date||tx.raw_date||'—').slice(0,16), color:'#334155' },
        { text: String(tx.from_account_number||'—'),  bold:true, color:'#0f172a' },
        { text: String(tx.to_account_number||'—'),    bold:true, color:'#0f172a' },
        { text: String(tx.bank_name||tx.destination_bank||'—'), color:'#334155' },
        { text: amt.toLocaleString('en-IN',{minimumFractionDigits:2}), align:'right', bold:true, color:'#059669' },
        { text: (tx.transaction_type||'TRANSFER').replace(/_/g,' '), color:'#64748b' },
      ], ML, y, i%2===0)
    })
    y += 5
  }

  /* ── SECTION 5: Full Account Registry ── */
  checkBreak(20)
  sectionBar('Complete Account Registry', '5')

  const regCols = [
    { label:'#',              w: 9  },
    { label:'Account Number', w: 40 },
    { label:'Holder Name',    w: 42 },
    { label:'Bank Name',      w: 42 },
    { label:'IFSC',           w: 26 },
    { label:'Layer',          w: 13 },
    { label:'Type',           w: 10 },
  ]
  y = drawThead(pdf, regCols, ML, y, '#0f172a')
  accounts.forEach((a:any, i) => {
    checkBreak(8)
    const ln = a.layer ?? -1
    const tc = ln === 0 ? '#DC2626' : lColor(ln)
    y = drawTrow(pdf, regCols, [
      { text: String(i+1),           align:'right', color:'#94a3b8' },
      { text: a.account_number||'—', bold:true, color:'#0f172a' },
      { text: a.holder_name||'—',    color:'#334155' },
      { text: a.bank_name||'—',      color:'#334155' },
      { text: a.ifsc||'—',           color:'#64748b' },
      { text: ln<0 ? '?' : `L${ln}`, bold:true, color: tc },
      { text: a.account_type||'—',   color:'#64748b' },
    ], ML, y, i%2===0)
  })

  /* ── Footer on every page ── */
  const totalPages = (pdf as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    pdf.setFillColor('#f1f5f9'); pdf.rect(0, PH-10, PW, 10, 'F')
    pdf.setFillColor('#10b981'); pdf.rect(0, PH-10, 2, 10, 'F')
    pdf.setFont('helvetica','normal'); pdf.setFontSize(6); pdf.setTextColor('#94a3b8')
    pdf.text('CyberTrail - Cyber Financial Fraud Transaction Trail Analyzer  |  FOR AUTHORIZED USE ONLY  |  Session data - not retained.', ML, PH-4.5)
    pdf.setFont('helvetica','bold'); pdf.setTextColor('#64748b')
    pdf.text(`Page ${p} of ${totalPages}`, PW-MR, PH-4.5, { align:'right' })
  }

  /* ── Save ── */
  const safe = (caseData.case_number||'report').replace(/[^a-zA-Z0-9_-]/g,'_')
  pdf.save(`CyberTrail_${safe}_${Date.now()}.pdf`)
}

/* ─────────────── Main Component ─────────────── */
export function ReportsPage() {
  const { analysis } = useAnalysis()
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [step, setStep] = useState('')

  // Stat calculations
  const caseData = analysis?.case || {}
  const accounts: any[] = analysis?.accounts || []
  const transactions: any[] = analysis?.transactions || []
  const layers: number[] = analysis?.layers || []
  const maxLayer = layers.length > 0 ? Math.max(...layers) : 0
  const fraudAmt = (caseData.reported_fraud_amount ?? caseData.total_fraud_amount)
    ? fmtCurrency(parseFloat(caseData.reported_fraud_amount ?? caseData.total_fraud_amount)) : '—'

  // Victim info with fallbacks
  const victimName =
    caseData.victim_name || caseData.victimName ||
    accounts.find((a:any) => a.layer === 0)?.holder_name || '—'
  const victimAcc =
    caseData.victim_account || caseData.victimAccount ||
    accounts.find((a:any) => a.layer === 0)?.account_number || '—'
  const victimBank =
    caseData.victim_bank || caseData.victimBank ||
    accounts.find((a:any) => a.layer === 0)?.bank_name || '—'

  // Layer-wise transaction grouping for preview
  const txByLayer: Record<number, any[]> = {}
  transactions.forEach((tx:any) => {
    const l = tx.layer ?? -1
    if (!txByLayer[l]) txByLayer[l] = []
    txByLayer[l].push(tx)
  })

  async function handleExport() {
    if (!analysis) return
    setExporting(true)
    try {
      setStep('Building money trail graph…')
      // Build canvas-based graph image from analysis graph data
      const nodes = analysis.graph?.nodes || []
      const edges = analysis.graph?.edges || []
      let graphDataUrl: string | null = null

      if (nodes.length > 0) {
        const canvas = buildGraphCanvas(nodes, edges)
        graphDataUrl = canvas.toDataURL('image/png')
      }

      setStep('Composing PDF…')
      await generateFullPDF(analysis, graphDataUrl)
    } catch (err) {
      console.error('PDF export error:', err)
      setStep('Export failed')
    } finally {
      setExporting(false)
      setStep('')
    }
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 py-1">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Investigation Reports
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Generate a comprehensive PDF from your uploaded analysis — all real extracted data.
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || !analysis}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-all duration-150"
        >
          {exporting ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{step || 'Generating…'}</>
          ) : (
            <><Download className="h-4 w-4" />Export Full PDF Report</>
          )}
        </button>
      </div>

      {/* ── No Analysis ── */}
      {!analysis && (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/15 p-14 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <div>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">No Document Uploaded Yet</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Upload a bank statement PDF or Excel workbook first to generate a report with real extracted fraud trail data.
            </p>
          </div>
          <button
            onClick={() => navigate('/cases/upload')}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors"
          >
            <Upload className="h-4 w-4" /> Upload Document
          </button>
        </div>
      )}

      {analysis && (
        <>
          {/* ── Summary stat cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: ShieldCheck, label: 'Reported Fraud Amount',      value: caseData.reported_fraud_amount ? fraudAmt : 'Not available in source', color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-900/20',     border:'border-red-100 dark:border-red-800/40'     },
              { icon: Users,       label: 'Transfer Accounts',    value: `${caseData.total_transfer_accounts ?? accounts.filter((a:any) => a.account_type !== 'ATM' && a.account_type !== 'POS' && a.account_type !== 'CASH').length}`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border:'border-emerald-100 dark:border-emerald-800/40' },
              { icon: Landmark,    label: 'Withdrawal Events',    value: `${caseData.withdrawal_event_count ?? (analysis?.withdrawals?.length ?? 0)}`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border:'border-purple-100 dark:border-purple-800/40' },
              { icon: ReceiptText, label: 'Transactions',      value: `${transactions.length}`, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border:'border-blue-100 dark:border-blue-800/40'    },
              { icon: Layers,      label: 'Max Layer Depth',   value: `Layer ${maxLayer}`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border:'border-purple-100 dark:border-purple-800/40' },
            ].map(({ icon: Icon, label, value, color, bg, border }) => (
              <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 flex items-center gap-3`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} border ${border}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className={`text-sm font-black truncate ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Case & Victim card ── */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#161b22] p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Case & Victim Details</h2>
              {caseData.case_number && (
                <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800/40">
                  {caseData.case_number}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              {[
                ['Case Number', caseData.case_number],
                ['NCRP Acknowledgement No.', caseData.acknowledgement_no],
                ['Victim Name', victimName],
                ['Victim Account No.', victimAcc],
                ['Victim Bank', victimBank],
                ['Source File', caseData.file_name],
              ].map(([label, val]) => (
                <div key={label} className="min-w-0">
                  <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={val||''}>{val || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Layer-wise tx preview ── */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#161b22] shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
              <Network className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Layer-wise Transaction Summary</h2>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">All layers included in PDF</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {Object.keys(txByLayer).map(Number).sort((a,b)=>a-b).map((ln) => {
                const txs = txByLayer[ln]
                const total = txs.reduce((s:number,t:any) => s + parseFloat(t.amount||0), 0)
                const c = ln === 0 ? '#DC2626' : lColor(ln)
                const layerLabel = ln < 0 ? 'Unknown' : ln === 0 ? 'L0 - Victim' : `Layer ${ln} (L${ln})`
                return (
                  <div key={ln} className="flex items-center gap-4 px-5 py-3.5">
                    <span
                      className="inline-flex items-center justify-center rounded-lg px-3 py-1 text-xs font-black min-w-[80px] text-center"
                      style={{ backgroundColor:`${c}18`, color:c, border:`1.5px solid ${c}40` }}
                    >
                      {layerLabel}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {txs.length} transaction{txs.length !== 1 ? 's' : ''}
                    </span>
                    <span className="ml-auto text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {fmtCurrency(total)}
                    </span>
                  </div>
                )
              })}
              {Object.keys(txByLayer).length === 0 && (
                <p className="px-5 py-8 text-sm text-slate-400 dark:text-slate-500 text-center">No transactions found.</p>
              )}
            </div>
          </div>

          {/* ── What's in the PDF ── */}
          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10 px-5 py-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">What's included in the exported PDF</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                {[
                  'Cover page with Report ID and timestamp',
                  `Case & victim details (name, account, bank)`,
                  `Money trail graph (visual node map)`,
                  `Layer-wise account tables (L0 - L${maxLayer})`,
                  `All ${transactions.length} transactions, grouped by layer`,
                  `Full account registry (${accounts.length} accounts)`,
                ].map(item => (
                  <div key={item} className="flex items-center gap-1.5">
                    <span className="text-emerald-500">✓</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
