import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  Download,
  FileImage,
  FileText,
  Focus,
  Image,
  Layers,
  Maximize,
  Minimize,
  Network,
  Printer,
  Search,
  SlidersHorizontal,
  Upload,
  UserRound,
  Landmark,
  X,
  ZoomIn,
  ZoomOut,
  Eye,
  ShieldCheck,
} from 'lucide-react'
import {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  ReactFlow,
  Handle,
  useEdgesState,
  useNodesState,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng, toSvg } from 'html-to-image'
import { useAnalysis } from '@/contexts/AnalysisContext'
import { cn } from '@/lib/utils'

// Palette for layers 1-N — each entry is unique, no repeats
const LAYER_PALETTE = [
  { bg: 'bg-[#ECFDF5]', border: 'border-[#A7F3D0]', text: 'text-emerald-600',  iconBg: 'bg-[#10B981]' }, // L1 emerald
  { bg: 'bg-[#EFF6FF]', border: 'border-[#BFDBFE]', text: 'text-blue-600',     iconBg: 'bg-[#3B82F6]' }, // L2 blue
  { bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', text: 'text-amber-600',    iconBg: 'bg-[#F59E0B]' }, // L3 amber
  { bg: 'bg-[#F5F3FF]', border: 'border-[#DDD6FE]', text: 'text-purple-600',   iconBg: 'bg-[#8B5CF6]' }, // L4 purple
  { bg: 'bg-[#FDF2F8]', border: 'border-[#FBCFE8]', text: 'text-fuchsia-600',  iconBg: 'bg-[#D946EF]' }, // L5 fuchsia
  { bg: 'bg-[#F0FDFA]', border: 'border-[#99F6E4]', text: 'text-teal-600',     iconBg: 'bg-[#14B8A6]' }, // L6 teal
  { bg: 'bg-[#EEF2FF]', border: 'border-[#C7D2FE]', text: 'text-indigo-600',   iconBg: 'bg-[#6366F1]' }, // L7 indigo
  { bg: 'bg-[#FFF7ED]', border: 'border-[#FED7AA]', text: 'text-orange-600',   iconBg: 'bg-[#F97316]' }, // L8 orange
  { bg: 'bg-[#F0FDF4]', border: 'border-[#BBF7D0]', text: 'text-green-600',    iconBg: 'bg-[#22C55E]' }, // L9 green
  { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-rose-600',     iconBg: 'bg-[#F43F5E]' }, // L10 rose
  { bg: 'bg-[#F0F9FF]', border: 'border-[#BAE6FD]', text: 'text-sky-600',      iconBg: 'bg-[#0EA5E9]' }, // L11 sky
  { bg: 'bg-[#ECFEFF]', border: 'border-[#A5F3FC]', text: 'text-cyan-600',     iconBg: 'bg-[#06B6D4]' }, // L12 cyan
]

// Edge connector colors matching the node palette (layer → hex)
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

// Custom Node Component matching the vertical tree node design
function MoneyTrailNode({ data, selected }: any) {
  const raw = data.raw || {}
  const layer = Number(raw.layer ?? 0)
  const isVictim = layer === 0
  const isFinal = Boolean(raw.isFinal || raw.isATM || raw.type === 'final' || raw.type === 'cash_out' || raw.type === 'ATM' || raw.type === 'POS' || raw.type === 'CASH')

  const isHighlighted = Boolean(data.isHighlighted || data.isSelected || selected)
  const isDimmed = Boolean(data.isDimmed && !isHighlighted)

  // Pick palette entry for this layer (layers 1+ cycle through LAYER_PALETTE)
  const paletteEntry = LAYER_PALETTE[(layer - 1) % LAYER_PALETTE.length] || LAYER_PALETTE[0]

  const theme = isVictim
    ? {
        bg: 'bg-[#FFF5F5]',
        border: 'border-[#FCA5A5]',
        text: 'text-red-600',
        iconBg: 'bg-[#EF4444]',
        label: 'L0 • Victim Account',
        Icon: UserRound,
      }
    : isFinal
    ? {
        bg: 'bg-[#F8FAFC]',
        border: 'border-[#CBD5E1]',
        text: 'text-slate-600',
        iconBg: 'bg-[#475569]',
        label: raw.account === 'CASH_COUNTER' || raw.type === 'CASH'
          ? `L${layer} • Physical Cash Withdrawal`
          : `L${layer} • Cash-out / Final Account`,
        Icon: Landmark,
      }
    : {
        ...paletteEntry,
        label: `L${layer} • Layer ${layer}`,
        Icon: Landmark,
      }

  const NodeIcon = theme.Icon

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between rounded-2xl border-2 px-3.5 py-3 shadow-xs transition-all min-w-[195px] max-w-[210px] bg-white',
        theme.bg,
        theme.border,
        isDimmed && 'opacity-30 grayscale-[30%] scale-[0.97]',
        isHighlighted
          ? 'ring-4 ring-emerald-500 border-emerald-500 shadow-xl shadow-emerald-500/20 scale-[1.05] z-30 bg-emerald-50/10'
          : 'hover:shadow-md'
      )}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!w-2.5 !h-2.5 border-2 border-white transition-all shadow-xs',
          data.hasSelection ? '!bg-emerald-500' : '!bg-slate-400',
          isHighlighted && 'scale-125 ring-2 ring-emerald-300'
        )}
        title="Target Handle"
      />

      <div className="flex items-start gap-2.5">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-xs transition-all', isHighlighted ? 'ring-2 ring-emerald-500 shadow-md' : '', theme.iconBg)}>
          <NodeIcon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-[10px] font-black tracking-wide', isHighlighted ? 'text-emerald-700 font-black' : theme.text)}>
            {theme.label}
          </p>
          <p className="truncate font-mono text-xs font-black text-slate-900 mt-0.5">{raw.account || raw.label}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="truncate text-[11px] font-medium text-slate-500">{raw.bank || 'Unknown Bank'}</p>
            {!isVictim && !isFinal && <ChevronDown className="h-3 w-3 text-slate-400 shrink-0 ml-1" />}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-700">
        {data.hasSelection ? (
          isVictim ? (
            <span className="text-red-600 font-black">-₹ {Number(raw.amountOut || 0).toLocaleString('en-IN')}</span>
          ) : isFinal ? (
            <span className="text-emerald-600 font-black">+₹ {Number(raw.amountIn || 0).toLocaleString('en-IN')}</span>
          ) : (
            <div className="flex items-center gap-1.5">
              {Number(raw.amountIn) > 0 && <span className="text-emerald-600 font-black" title="Inward Cash">+₹{Number(raw.amountIn).toLocaleString('en-IN')}</span>}
              {Number(raw.amountOut) > 0 && <span className="text-red-600 font-black" title="Outward Cash">-₹{Number(raw.amountOut).toLocaleString('en-IN')}</span>}
            </div>
          )
        ) : (
          <span className={cn(isHighlighted && 'text-emerald-700 font-black')}>
            {raw.totalAmountStr || `₹ ${Number(raw.amountOut || raw.amountIn || 0).toLocaleString('en-IN')}`}
          </span>
        )}
        <span className="text-slate-400 font-medium shrink-0 ml-1">{raw.txnCountStr || `${raw.txns || 1} txns`}</span>
      </div>

      {/* Associated Withdrawals Badge in Show All Mode */}
      {raw.displayMode === 'SHOW_ALL' && raw.withdrawalCount > 0 && (
        <div className="mt-2 rounded-xl bg-purple-50 border border-purple-200 px-2 py-1 flex items-center justify-between text-[10px]">
          <span className="font-extrabold text-purple-700 flex items-center gap-1">
            <Landmark className="w-3 h-3 text-purple-600 shrink-0" />
            {raw.withdrawalCount} Withdrawal{raw.withdrawalCount > 1 ? 's' : ''}
          </span>
          <span className="font-mono font-black text-purple-950">
            ₹{Number(raw.totalWithdrawalAmount || 0).toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!w-2.5 !h-2.5 border-2 border-white transition-all shadow-xs',
          data.hasSelection ? '!bg-red-500' : '!bg-slate-400',
          isHighlighted && 'scale-125 ring-2 ring-red-300'
        )}
        title="Source Handle"
      />
    </div>
  )
}

const nodeTypes = {
  moneyNode: MoneyTrailNode,
}

// Dataset matching the vertical tree screenshot exactly
const DEMO_NODES = [
  // L0 - Victim
  { id: 'v1', layer: 0, account: 'XXXX1234', bank: 'State Bank of India', totalAmountStr: '₹ 24,50,000', txnCountStr: '12 txns', amountIn: 0, amountOut: 2450000, txns: 12, ifsc: 'SBIN0001234', connectedIn: '0', connectedOut: '3 to Layer 1', pos: { x: 680, y: 0 } },

  // L1 - Layer 1 (3 nodes)
  { id: 'l1_1', layer: 1, account: 'XXXX5678', bank: 'HDFC Bank', totalAmountStr: '₹ 8,00,000', txnCountStr: '5 txns', amountIn: 800000, amountOut: 800000, txns: 5, ifsc: 'HDFC0005678', connectedIn: '1 from Victim', connectedOut: '2 to Layer 2', pos: { x: 180, y: 160 } },
  { id: 'l1_2', layer: 1, account: 'XXXX9012', bank: 'ICICI Bank', totalAmountStr: '₹ 9,50,000', txnCountStr: '4 txns', amountIn: 950000, amountOut: 950000, txns: 4, ifsc: 'ICIC0009012', connectedIn: '1 from Victim', connectedOut: '2 to Layer 2', pos: { x: 680, y: 160 } },
  { id: 'l1_3', layer: 1, account: 'XXXX7890', bank: 'Axis Bank', totalAmountStr: '₹ 7,00,000', txnCountStr: '3 txns', amountIn: 700000, amountOut: 700000, txns: 3, ifsc: 'UTIB0007890', connectedIn: '1 from Victim', connectedOut: '2 to Layer 2', pos: { x: 1180, y: 160 } },

  // L2 - Layer 2 (6 nodes)
  { id: 'l2_1', layer: 2, account: 'XXXX3456', bank: 'Kotak Mahindra', totalAmountStr: '₹ 4,00,000', txnCountStr: '2 txns', amountIn: 400000, amountOut: 400000, txns: 2, ifsc: 'KKBK0003456', connectedIn: '1 from Layer 1', connectedOut: '2 to Layer 3', pos: { x: 50, y: 340 } },
  { id: 'l2_2', layer: 2, account: 'XXXX6678', bank: 'Yes Bank', totalAmountStr: '₹ 4,00,000', txnCountStr: '3 txns', amountIn: 400000, amountOut: 400000, txns: 3, ifsc: 'YESB0006678', connectedIn: '1 from Layer 1', connectedOut: '1 to Layer 3', pos: { x: 290, y: 340 } },
  { id: 'l2_3', layer: 2, account: 'XXXX1122', bank: 'Bank of Baroda', totalAmountStr: '₹ 5,00,000', txnCountStr: '2 txns', amountIn: 500000, amountOut: 500000, txns: 2, ifsc: 'BARB0001122', connectedIn: '1 from Layer 1', connectedOut: '1 to Layer 3', pos: { x: 550, y: 340 } },
  { id: 'l2_4', layer: 2, account: 'XXXX3344', bank: 'Canara Bank', totalAmountStr: '₹ 4,50,000', txnCountStr: '2 txns', amountIn: 450000, amountOut: 450000, txns: 2, ifsc: 'CNRB0003344', connectedIn: '1 from Layer 1', connectedOut: '2 to Layer 3', pos: { x: 790, y: 340 } },
  { id: 'l2_5', layer: 2, account: 'XXXX9988', bank: 'IDFC First Bank', totalAmountStr: '₹ 3,00,000', txnCountStr: '1 txn', amountIn: 300000, amountOut: 300000, txns: 1, ifsc: 'IDFB0009988', connectedIn: '1 from Layer 1', connectedOut: '1 to Layer 3', pos: { x: 1050, y: 340 } },
  { id: 'l2_6', layer: 2, account: 'XXXX7766', bank: 'Union Bank', totalAmountStr: '₹ 4,00,000', txnCountStr: '2 txns', amountIn: 400000, amountOut: 400000, txns: 2, ifsc: 'UBIN0007766', connectedIn: '1 from Layer 1', connectedOut: '1 to Layer 3', pos: { x: 1290, y: 340 } },

  // L3 - Layer 3 (8 nodes)
  { id: 'l3_1', layer: 3, account: 'XXXX5566', bank: 'Paytm Payments', totalAmountStr: '₹ 2,00,000', txnCountStr: '1 txn', amountIn: 200000, amountOut: 200000, txns: 1, ifsc: 'PYTM0005566', connectedIn: '1 from Layer 2', connectedOut: '1 to Final Account', pos: { x: 0, y: 520 } },
  { id: 'l3_2', layer: 3, account: 'XXXX7788', bank: 'PhonePe', totalAmountStr: '₹ 2,00,000', txnCountStr: '1 txn', amountIn: 200000, amountOut: 200000, txns: 1, ifsc: 'YBL0007788', connectedIn: '1 from Layer 2', connectedOut: '1 to Final Account', pos: { x: 150, y: 520 } },
  { id: 'l3_3', layer: 3, account: 'XXXX9900', bank: 'Razorpay', totalAmountStr: '₹ 4,00,000', txnCountStr: '3 txns', amountIn: 400000, amountOut: 0, txns: 3, ifsc: 'RAZR0009900', connectedIn: '1 from Layer 2', connectedOut: '0', pos: { x: 320, y: 520 } },
  { id: 'l3_4', layer: 3, account: 'XXXX2211', bank: 'IndusInd Bank', totalAmountStr: '₹ 2,00,000', txnCountStr: '1 txn', amountIn: 200000, amountOut: 200000, txns: 1, ifsc: 'INDB0002211', connectedIn: '1 from Layer 2', connectedOut: '1 to Final Account', pos: { x: 500, y: 520 } },
  { id: 'l3_5', layer: 3, account: 'XXXX4433', bank: 'Federal Bank', totalAmountStr: '₹ 2,50,000', txnCountStr: '2 txns', amountIn: 250000, amountOut: 250000, txns: 2, ifsc: 'FDRL0004433', connectedIn: '1 from Layer 2', connectedOut: '1 to Final Account', pos: { x: 660, y: 520 } },
  { id: 'l3_6', layer: 3, account: 'XXXX6655', bank: 'AU Small Finance', totalAmountStr: '₹ 4,50,000', txnCountStr: '2 txns', amountIn: 450000, amountOut: 0, txns: 2, ifsc: 'AUBL0006655', connectedIn: '1 from Layer 2', connectedOut: '0', pos: { x: 820, y: 520 } },
  { id: 'l3_7', layer: 3, account: 'XXXX8877', bank: 'Jupiter', totalAmountStr: '₹ 3,00,000', txnCountStr: '1 txn', amountIn: 300000, amountOut: 300000, txns: 1, ifsc: 'JUPT0008877', connectedIn: '1 from Layer 2', connectedOut: '1 to Final Account', pos: { x: 1020, y: 520 } },
  { id: 'l3_8', layer: 3, account: 'XXXX9999', bank: 'Navi', totalAmountStr: '₹ 4,00,000', txnCountStr: '2 txns', amountIn: 400000, amountOut: 400000, txns: 2, ifsc: 'NAVI0009999', connectedIn: '1 from Layer 2', connectedOut: '1 to Final Account', pos: { x: 1220, y: 520 } },

  // L4 - Final Accounts (3 nodes)
  { id: 'f1', layer: 4, account: 'XXXX1010', bank: 'Unknown Bank', totalAmountStr: '₹ 2,00,000', txnCountStr: '1 txn', isFinal: true, amountIn: 200000, amountOut: 0, txns: 1, ifsc: 'UNKN0001010', connectedIn: '2 from Layer 3', connectedOut: '0', pos: { x: 75, y: 700 } },
  { id: 'f2', layer: 4, account: 'XXXX2020', bank: 'Unknown Bank', totalAmountStr: '₹ 2,50,000', txnCountStr: '1 txn', isFinal: true, amountIn: 250000, amountOut: 0, txns: 1, ifsc: 'UNKN0002020', connectedIn: '2 from Layer 3', connectedOut: '0', pos: { x: 580, y: 700 } },
  { id: 'f3', layer: 4, account: 'XXXX3030', bank: 'Unknown Bank', totalAmountStr: '₹ 4,00,000', txnCountStr: '1 txn', isFinal: true, amountIn: 400000, amountOut: 0, txns: 1, ifsc: 'UNKN0003030', connectedIn: '2 from Layer 3', connectedOut: '0', pos: { x: 1120, y: 700 } },
]

const DEMO_EDGES = [
  // L0 -> L1
  { id: 'e_v1_l1_1', source: 'v1', target: 'l1_1', amount: '₹ 8,00,000', txnsText: '(5 txns)', color: '#10B981', amountValue: 800000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR8000000001', date: '12 Jan 2024 10:24', bankPair: 'SBI → HDFC' },
  { id: 'e_v1_l1_2', source: 'v1', target: 'l1_2', amount: '₹ 9,50,000', txnsText: '(4 txns)', color: '#10B981', amountValue: 950000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR9500000002', date: '12 Jan 2024 10:45', bankPair: 'SBI → ICICI' },
  { id: 'e_v1_l1_3', source: 'v1', target: 'l1_3', amount: '₹ 7,00,000', txnsText: '(3 txns)', color: '#10B981', amountValue: 700000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR7000000003', date: '12 Jan 2024 11:00', bankPair: 'SBI → Axis' },

  // L1 -> L2
  { id: 'e_l1_1_l2_1', source: 'l1_1', target: 'l2_1', amount: '₹ 4,00,000', txnsText: '(2 txns)', color: '#3B82F6', amountValue: 400000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR4000000004', date: '12 Jan 2024 11:30', bankPair: 'HDFC → Kotak' },
  { id: 'e_l1_1_l2_2', source: 'l1_1', target: 'l2_2', amount: '₹ 4,00,000', txnsText: '(3 txns)', color: '#3B82F6', amountValue: 400000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR4000000005', date: '12 Jan 2024 11:45', bankPair: 'HDFC → Yes Bank' },
  { id: 'e_l1_2_l2_3', source: 'l1_2', target: 'l2_3', amount: '₹ 5,00,000', txnsText: '(2 txns)', color: '#3B82F6', amountValue: 500000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR5000000006', date: '12 Jan 2024 12:15', bankPair: 'ICICI → BOB' },
  { id: 'e_l1_2_l2_4', source: 'l1_2', target: 'l2_4', amount: '₹ 4,50,000', txnsText: '(2 txns)', color: '#3B82F6', amountValue: 450000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR4500000007', date: '12 Jan 2024 12:30', bankPair: 'ICICI → Canara' },
  { id: 'e_l1_3_l2_5', source: 'l1_3', target: 'l2_5', amount: '₹ 3,00,000', txnsText: '(1 txn)', color: '#3B82F6', amountValue: 300000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR3000000008', date: '12 Jan 2024 13:00', bankPair: 'Axis → IDFC' },
  { id: 'e_l1_3_l2_6', source: 'l1_3', target: 'l2_6', amount: '₹ 4,00,000', txnsText: '(2 txns)', color: '#3B82F6', amountValue: 400000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR4000000009', date: '12 Jan 2024 13:15', bankPair: 'Axis → Union' },

  // L2 -> L3
  { id: 'e_l2_1_l3_1', source: 'l2_1', target: 'l3_1', amount: '₹ 2,00,000', txnsText: '(1 txn)', color: '#F59E0B', amountValue: 200000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR2000000010', date: '12 Jan 2024 14:00', bankPair: 'Kotak → Paytm' },
  { id: 'e_l2_1_l3_2', source: 'l2_1', target: 'l3_2', amount: '₹ 2,00,000', txnsText: '(1 txn)', color: '#F59E0B', amountValue: 200000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR2000000011', date: '12 Jan 2024 14:15', bankPair: 'Kotak → PhonePe' },
  { id: 'e_l2_2_l3_3', source: 'l2_2', target: 'l3_3', amount: '₹ 4,00,000', txnsText: '(3 txns)', color: '#F59E0B', amountValue: 400000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR4000000012', date: '12 Jan 2024 14:30', bankPair: 'Yes → Razorpay' },
  { id: 'e_l2_3_l3_4', source: 'l2_3', target: 'l3_4', amount: '₹ 2,00,000', txnsText: '(1 txn)', color: '#F59E0B', amountValue: 200000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR2000000013', date: '12 Jan 2024 15:00', bankPair: 'BOB → IndusInd' },
  { id: 'e_l2_4_l3_5', source: 'l2_4', target: 'l3_5', amount: '₹ 2,50,000', txnsText: '(2 txns)', color: '#F59E0B', amountValue: 250000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR2500000014', date: '12 Jan 2024 15:15', bankPair: 'Canara → Federal' },
  { id: 'e_l2_4_l3_6', source: 'l2_4', target: 'l3_6', amount: '₹ 4,50,000', txnsText: '(2 txns)', color: '#F59E0B', amountValue: 450000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR4500000015', date: '12 Jan 2024 15:30', bankPair: 'Canara → AU Small' },
  { id: 'e_l2_5_l3_7', source: 'l2_5', target: 'l3_7', amount: '₹ 3,00,000', txnsText: '(1 txn)', color: '#F59E0B', amountValue: 300000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR3000000016', date: '12 Jan 2024 16:00', bankPair: 'IDFC → Jupiter' },
  { id: 'e_l2_6_l3_8', source: 'l2_6', target: 'l3_8', amount: '₹ 4,00,000', txnsText: '(2 txns)', color: '#F59E0B', amountValue: 400000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR4000000017', date: '12 Jan 2024 16:15', bankPair: 'Union → Navi' },

  // L3 -> L4 (Final)
  { id: 'e_l3_1_f1', source: 'l3_1', target: 'f1', amount: '₹ 2,00,000', txnsText: '(1 txn)', color: '#64748B', amountValue: 200000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR2000000018', date: '13 Jan 2024 10:00', bankPair: 'Paytm → Unknown' },
  { id: 'e_l3_4_f2', source: 'l3_4', target: 'f2', amount: '₹ 2,50,000', txnsText: '(1 txn)', color: '#64748B', amountValue: 250000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR2500000019', date: '13 Jan 2024 10:30', bankPair: 'IndusInd → Unknown' },
  { id: 'e_l3_8_f3', source: 'l3_8', target: 'f3', amount: '₹ 4,00,000', txnsText: '(1 txn)', color: '#64748B', amountValue: 400000, mode: 'ACCOUNT_TRANSFER', utr: 'UTR4000000020', date: '13 Jan 2024 11:00', bankPair: 'Navi → Unknown' },
]

const layerLegend = [
  { label: 'Victim Account', color: '#EF4444' },
  { label: 'Layer 1', color: '#10B981' },
  { label: 'Layer 2', color: '#3B82F6' },
  { label: 'Layer 3', color: '#F59E0B' },
  { label: 'Final Account', color: '#64748B' },
]

export function MoneyTrailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { analysis, setAnalysis } = useAnalysis()
  const graphRef = useRef<HTMLDivElement>(null)

  // Start with nothing selected — clean slate every time
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null)
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [displayMode, setDisplayMode] = useState<'LAYERS_ONLY' | 'SHOW_ALL'>('LAYERS_ONLY')
  const [revealMode, setRevealMode] = useState(false)
  const [revealLevel, setRevealLevel] = useState(0)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [exportOpen, setExportOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Exit full screen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // Reset all selections whenever a new analysis is loaded or page is visited
  useEffect(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
    setSelectedLayer(null)
  }, [analysis])

  const graphData = useMemo(() => {
    if (!analysis || !analysis.graph?.nodes?.length) {
      return { nodes: DEMO_NODES, edges: DEMO_EDGES }
    }

    const apiNodes: any[] = analysis.graph.nodes
    const apiEdges: any[] = analysis.graph.edges || []

    const accByNumber = new Map<string, any>()
    ;(analysis.accounts || []).forEach((acc: any) => {
      accByNumber.set(acc.account_number, acc)
      accByNumber.set(acc.id, acc)
    })

    // Map transaction id -> record for date/utr lookups
    const txById = new Map<string, any>()
    ;(analysis.transactions || []).forEach((tx: any) => {
      txById.set(tx.id, tx)
    })

    // Compute in/out degree for each node
    const inDegree = new Map<string, number>()
    const outDegree = new Map<string, number>()
    apiNodes.forEach((n: any) => { inDegree.set(n.id, 0); outDegree.set(n.id, 0) })
    apiEdges.forEach((e: any) => {
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
      outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1)
    })

    // Build processed nodes using backend layer assignments
    const nodes = apiNodes.map((node: any) => {
      const data = node.data || {}
      const rawLayer = data.layer
      let layer: number
      if (rawLayer !== null && rawLayer !== undefined && Number.isFinite(Number(rawLayer))) {
        layer = Number(rawLayer)
      } else {
        // Sink nodes (no outgoing) and unknown-layer nodes go to the final bucket
        layer = 999
      }

      const accountType = String(data.account_type || '').toUpperCase()
      const isATM = accountType === 'ATM' || accountType === 'POS' || accountType === 'CASH'
      const isFinal = data.is_final === true || isATM

      const accRecord = accByNumber.get(data.account_number) || accByNumber.get(node.id) || {}
      const withdrawals = accRecord.withdrawals || data.withdrawals || []
      const withdrawalCount = accRecord.withdrawal_count || withdrawals.length
      const totalWithdrawalAmount = accRecord.total_withdrawal_amount || withdrawals.reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0)

      return {
        id: node.id,
        layer,
        account: data.account_number || node.id,
        bank: data.bank_name || 'Unknown Bank',
        ifsc: data.ifsc || 'Not available',
        totalAmountStr: `\u20B9 ${Number(data.total_outgoing || data.total_incoming || 0).toLocaleString('en-IN')}`,
        txnCountStr: (() => {
          // Victim (L0): show how many outgoing transfers it made
          // All other accounts: show incoming transfers received (= "Layer N entries" count)
          const isVictimNode = layer === 0
          const count = isVictimNode
            ? (data.outgoing_count ?? data.transaction_count ?? 1)
            : (data.incoming_count ?? Math.max(1, Math.ceil((data.transaction_count || 2) / 2)))
          return `${count} txn${count !== 1 ? 's' : ''}`
        })(),
        amountIn: Number(data.total_incoming || 0),
        amountOut: Number(data.total_outgoing || 0),
        isFinal,
        isATM,
        type: accountType,
        connectedIn: `${inDegree.get(node.id) || 0} from Layer ${Math.max(0, layer - 1)}`,
        connectedOut: `${outDegree.get(node.id) || 0} to Layer ${layer + 1}`,
        withdrawals,
        withdrawalCount,
        totalWithdrawalAmount,
        displayMode,
        pos: { x: 0, y: 0 },
      }
    })

    // Group by layer for layout
    const layerGroups = new Map<number, any[]>()
    nodes.forEach((n) => {
      const g = layerGroups.get(n.layer) || []
      g.push(n)
      layerGroups.set(n.layer, g)
    })

    // Find the actual maximum real layer (excluding the 999 sentinel for unknowns)
    const realMaxLayer = Math.max(...nodes.filter((n) => n.layer !== 999).map((n) => n.layer), 0)
    const finalLayer = realMaxLayer + 1

    // Replace sentinel 999 with the actual final layer number
    nodes.forEach((n) => {
      if (n.layer === 999) {
        n.layer = finalLayer
        n.connectedIn = `${inDegree.get(n.id) || 0} from Layer ${realMaxLayer}`
        n.connectedOut = `0`
        // Re-bucket into correct group
        layerGroups.delete(999)
        const fg = layerGroups.get(finalLayer) || []
        fg.push(n)
        layerGroups.set(finalLayer, fg)
      }
    })

    const sortedLayers = [...layerGroups.keys()].sort((a, b) => a - b)
    const NODE_W = 220
    const HORIZ_GAP = 40
    const VERT_GAP = 185

    sortedLayers.forEach((layerKey, rowIndex) => {
      const layerNodes = layerGroups.get(layerKey) || []
      const totalWidth = layerNodes.length * NODE_W + (layerNodes.length - 1) * HORIZ_GAP
      layerNodes.forEach((node, colIndex) => {
        node.pos = {
          x: colIndex * (NODE_W + HORIZ_GAP) - totalWidth / 2 + NODE_W / 2,
          y: rowIndex * VERT_GAP,
        }
      })
    })

    const nodeById = new Map(nodes.map((n) => [n.id, n]))

    const edges = apiEdges.map((edge: any, index: number) => {
      const src = nodeById.get(edge.source)
      const tgt = nodeById.get(edge.target)
      const srcLayer = src?.layer ?? 0
      // srcLayer 0 = victim (use first palette color), srcLayer 1+ index into LAYER_EDGE_COLORS
      const color = srcLayer === 0
        ? LAYER_EDGE_COLORS[0]
        : LAYER_EDGE_COLORS[(srcLayer - 1) % LAYER_EDGE_COLORS.length]

      const txRecord = txById.get(edge.id)
      const utr = edge.utr_rrn || txRecord?.utr_rrn || txRecord?.transaction_id || `TXN-${index + 1}`
      const date = txRecord?.transaction_date || txRecord?.raw_date || ''
      const srcBank = src?.bank?.split(' ').slice(0, 2).join(' ') || 'Bank'
      const tgtBank = tgt?.bank?.split(' ').slice(0, 2).join(' ') || 'Bank'

      return {
        id: edge.id || `edge-${index}`,
        source: edge.source,
        target: edge.target,
        color,
        amountValue: Number(edge.amount || 0),
        amount: `\u20B9 ${Number(edge.amount || 0).toLocaleString('en-IN')}`,
        txnsText: '(1 txn)',
        mode: edge.transaction_type || 'ACCOUNT_TRANSFER',
        utr,
        date,
        bankPair: `${srcBank} \u2192 ${tgtBank}`,
      }
    })

    return { nodes, edges }
  }, [analysis])

  // Exclude final-account sentinel layer from max layer display
  const realNodes = graphData.nodes.filter((n) => !n.isFinal)
  const maxLayer = realNodes.length > 0 ? Math.max(...realNodes.map((n) => n.layer), 0) : Math.max(...graphData.nodes.map((n) => n.layer), 0)
  const maxVisibleLayer = revealMode ? revealLevel : null

  const visibleNodes = useMemo(() => {
    const byLayer = maxVisibleLayer === null
      ? graphData.nodes
      : graphData.nodes.filter((node) => node.layer <= maxVisibleLayer)
    // Cash-out (ATM/POS/CASH) nodes only appear in SHOW ALL mode
    return displayMode === 'LAYERS_ONLY' ? byLayer.filter((n) => !(n as any).isATM) : byLayer
  }, [graphData.nodes, maxVisibleLayer, displayMode])

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes])
  const visibleEdges = useMemo(() => {
    return graphData.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
  }, [graphData.edges, visibleIds])

  const hasSelection = selectedLayer !== null || selectedNode !== null || selectedEdge !== null

  const highlightedNodeIds = useMemo(() => {
    const set = new Set<string>()
    if (selectedNode) {
      set.add(selectedNode.id)
      graphData.edges.forEach((e) => {
        if (e.source === selectedNode.id) set.add(e.target)
        if (e.target === selectedNode.id) set.add(e.source)
      })
    } else if (selectedEdge) {
      set.add(selectedEdge.source)
      set.add(selectedEdge.target)
    } else if (selectedLayer !== null) {
      graphData.nodes.forEach((n) => {
        if (n.layer === selectedLayer) {
          set.add(n.id)
        }
      })
      graphData.edges.forEach((e) => {
        const srcNode = graphData.nodes.find((n) => n.id === e.source)
        const tgtNode = graphData.nodes.find((n) => n.id === e.target)
        if (srcNode?.layer === selectedLayer || tgtNode?.layer === selectedLayer) {
          set.add(e.source)
          set.add(e.target)
        }
      })
    }
    return set
  }, [selectedNode, selectedEdge, selectedLayer, graphData])

  const highlightedEdgeIds = useMemo(() => {
    const set = new Set<string>()
    if (selectedNode) {
      graphData.edges.forEach((e) => {
        if (e.source === selectedNode.id || e.target === selectedNode.id) {
          set.add(e.id)
        }
      })
    } else if (selectedEdge) {
      set.add(selectedEdge.id)
    } else if (selectedLayer !== null) {
      graphData.edges.forEach((e) => {
        const srcNode = graphData.nodes.find((n) => n.id === e.source)
        const tgtNode = graphData.nodes.find((n) => n.id === e.target)
        if (srcNode?.layer === selectedLayer || tgtNode?.layer === selectedLayer) {
          set.add(e.id)
        }
      })
    }
    return set
  }, [selectedNode, selectedEdge, selectedLayer, graphData])

  const initialFlowNodes = useMemo(() => {
    return visibleNodes.map((node) => {
      const isHighlighted = highlightedNodeIds.has(node.id)
      const isSelected = selectedNode?.id === node.id
      const isDimmed = hasSelection && !isHighlighted
      return {
        id: node.id,
        type: 'moneyNode',
        position: node.pos || { x: 300, y: node.layer * 180 },
        data: {
          raw: node,
          isHighlighted,
          isSelected,
          isDimmed,
          hasSelection,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      }
    })
  }, [visibleNodes, highlightedNodeIds, selectedNode, hasSelection])

  const initialFlowEdges = useMemo(() => {
    return visibleEdges.map((edge) => {
      const isHighlighted = highlightedEdgeIds.has(edge.id)
      const isDimmed = hasSelection && !isHighlighted

      // DEFAULT VIEW (when nothing is selected): clean, standard graph styling exactly like before
      if (!hasSelection) {
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: edge.color || '#94A3B8',
            strokeWidth: 1.8,
          },
          label: visibleEdges.length > 250 ? null : (
            <div className="text-center bg-white/95 px-2.5 py-1 rounded-lg border border-slate-200/90 shadow-2xs">
              <p className="text-[10px] font-black text-slate-900 leading-none">{edge.amount}</p>
              <p className="text-[9px] font-medium text-slate-400 leading-none mt-0.5">{edge.txnsText}</p>
            </div>
          ),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edge.color || '#94A3B8',
            width: 12,
            height: 12,
          },
          data: edge,
        }
      }

      // UNSELECTED EDGES DURING SELECTION: cleanly greyed out
      if (isDimmed) {
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#CBD5E1',
            strokeWidth: 1.2,
            opacity: 0.15,
          },
          label: null,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#CBD5E1',
            width: 8,
            height: 8,
          },
          data: edge,
        }
      }

      // HIGHLIGHTED SELECTION
      let isOutward = false
      let isInward = false

      if (selectedNode) {
        // Node selection: show Outward (Red) vs Inward (Green) relative to selected node
        if (edge.source === selectedNode.id) isOutward = true
        if (edge.target === selectedNode.id) isInward = true
      } else if (selectedLayer !== null) {
        // Layer selection: ALL connectors for selected layer show in GREEN
        isInward = true
        isOutward = false
      }

      const strokeColor = isOutward ? '#EF4444' : '#10B981'
      const isCashWithdrawal = edge.mode === 'CASH_WITHDRAWAL' || edge.mode === 'ATM' || edge.target === 'CASH_COUNTER'
      const labelSubtitle = isCashWithdrawal
        ? 'Cash Withdrawal'
        : isOutward
        ? 'Outward Transfer'
        : selectedNode
        ? 'Inward Transfer'
        : edge.txnsText

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: strokeColor,
          strokeWidth: 3.5,
          strokeDasharray: isOutward ? '6,4' : undefined,
        },
        label: (
          <div
            className={cn(
              'text-center px-2.5 py-1 rounded-lg border transition-all shadow-md animate-pulse font-black',
              isOutward
                ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-400/40'
                : 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400/40'
            )}
          >
            <p className={cn('text-[10px] font-black leading-none', isOutward ? 'text-red-700' : 'text-emerald-800')}>
              {isOutward ? `- ${edge.amount}` : selectedNode ? `+ ${edge.amount}` : edge.amount}
            </p>
            <p className={cn('text-[9px] font-medium leading-none mt-0.5', isOutward ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold')}>
              {labelSubtitle}
            </p>
          </div>
        ),
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14,
        },
        data: edge,
      }
    })
  }, [visibleEdges, highlightedEdgeIds, hasSelection, selectedNode, selectedLayer, graphData])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowEdges)

  useEffect(() => {
    setNodes(initialFlowNodes)
    setEdges(initialFlowEdges)
  }, [initialFlowNodes, initialFlowEdges, setEdges, setNodes])

  const totalAccountsCount = analysis?.case?.total_accounts || analysis?.accounts?.length || 18
  const totalTxCount = analysis?.case?.total_transactions || analysis?.transactions?.length || 27
  const totalAmount = Number(analysis?.case?.total_fraud_amount || 2450000)

  const transactionRows = useMemo(() => {
    const nodeById = new Map(graphData.nodes.map((n) => [n.id, n]))
    return graphData.edges
      .map((edge, idx) => {
        const src = nodeById.get(edge.source)
        const tgt = nodeById.get(edge.target)
        return {
          ...edge,
          index: idx + 1,
          sourceAccount: src?.account || edge.source,
          targetAccount: tgt?.account || edge.target,
          layer: tgt?.layer ?? 1,
        }
      })
      .filter((row) => {
        const q = search.trim().toLowerCase()
        const matchesSearch =
          !q ||
          [row.sourceAccount, row.targetAccount, row.utr, row.bankPair].some((val) =>
            String(val).toLowerCase().includes(q)
          )
        return matchesSearch && (typeFilter === 'ALL' || row.mode === typeFilter)
      })
  }, [graphData, search, typeFilter])

  async function exportGraph(format: 'png' | 'svg') {
    if (!graphRef.current || !nodes.length) return

    try {
      const viewportEl = graphRef.current.querySelector('.react-flow__viewport') as HTMLElement
      if (!viewportEl) return

      // Compute bounding box around ALL nodes in the graph
      const bounds = getNodesBounds(
        nodes.map((n: any) => ({
          ...n,
          width: n.measured?.width || n.width || 280,
          height: n.measured?.height || n.height || 140,
        }))
      )

      const padding = 100
      const imageWidth = Math.max(1400, Math.ceil(bounds.width + padding * 2))
      const imageHeight = Math.max(900, Math.ceil(bounds.height + padding * 2))

      // Calculate viewport transform to fit all nodes into full image canvas
      const viewport = getViewportForBounds(
        bounds,
        imageWidth,
        imageHeight,
        0.1,
        2.0,
        0.15
      )

      const options = {
        backgroundColor: '#ffffff',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
        filter: (node: HTMLElement) => {
          const className = String(node?.className || '')
          return !className.includes('react-flow__controls') && !className.includes('react-flow__minimap')
        },
      }

      const dataUrl = format === 'png' ? await toPng(viewportEl, options) : await toSvg(viewportEl, options)
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `money-trail-${id || 'analysis'}.${format}`
      link.click()
    } catch (err) {
      console.error('Failed to export graph:', err)
    } finally {
      setExportOpen(false)
    }
  }

  if (!analysis) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center min-h-[65vh] py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
          <Upload className="h-9 w-9" />
        </div>
        <h2 className="mt-6 text-2xl font-black text-slate-900 tracking-tight">No Document Uploaded Yet</h2>
        <p className="mt-2 max-w-md text-xs text-slate-500 leading-relaxed font-medium">
          You haven't uploaded a document yet. Upload a complaint PDF or Excel workbook to parse transactions and build the interactive money trail graph.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/cases/upload')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-all"
          >
            <Upload className="h-4 w-4" /> Upload Document
          </button>
          <button
            onClick={() =>
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
                graph: {
                  nodes: DEMO_NODES.map((n) => ({ id: n.id, data: n })),
                  edges: DEMO_EDGES,
                },
                layers: [0, 1, 2, 3, 4],
                pages: {},
                sections: [],
              })
            }
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-all"
          >
            <Network className="h-4 w-4 text-emerald-600" /> Explore Sample Money Trail
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 py-1">
      {/* Title Header & Action Controls */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Money Trail</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Visualize the flow of funds across multiple layers and explore account relationships.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Display Mode Toggle: Layers Only vs Show All */}
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              id="btn-layers-only"
              onClick={() => setDisplayMode('LAYERS_ONLY')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                displayMode === 'LAYERS_ONLY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
              title="Display transfer layers only"
            >
              <Layers className="h-3.5 w-3.5" />
              Layers Only
            </button>
            <button
              id="btn-show-all"
              onClick={() => setDisplayMode('SHOW_ALL')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                displayMode === 'SHOW_ALL' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
              title="Display transfers with linked withdrawal events"
            >
              <Eye className="h-3.5 w-3.5" />
              Show All
            </button>
          </div>

          {/* View Switcher Pill */}
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => {
                setRevealMode(false)
                setSelectedLayer(null)
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                !revealMode ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Full View
            </button>
            <button
              onClick={() => {
                setRevealMode(true)
                setRevealLevel(0)
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                revealMode ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Reveal Mode
            </button>
          </div>

          {/* Action icons */}
          <button
            title="Zoom out"
            onClick={() => document.querySelector<HTMLButtonElement>('.react-flow__controls-zoomout')?.click()}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-xs hover:bg-slate-50 hover:text-emerald-600"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            title="Zoom in"
            onClick={() => document.querySelector<HTMLButtonElement>('.react-flow__controls-zoomin')?.click()}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-xs hover:bg-slate-50 hover:text-emerald-600"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            title="Fit graph"
            onClick={() => document.querySelector<HTMLButtonElement>('.react-flow__controls-fitview')?.click()}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-xs hover:bg-slate-50 hover:text-emerald-600"
          >
            <Focus className="h-4 w-4" />
          </button>
          <button
            title={isFullscreen ? 'Exit Full Screen (ESC)' : 'View Full Screen'}
            onClick={() => setIsFullscreen((prev) => !prev)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-xs transition-colors',
              isFullscreen
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-emerald-600'
            )}
          >
            {isFullscreen ? <Minimize className="h-4 w-4 text-emerald-600" /> : <Maximize className="h-4 w-4 text-slate-500" />}
            <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              Export Graph
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  onClick={() => exportGraph('png')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Image className="h-4 w-4 text-emerald-600" /> PNG image
                </button>
                <button
                  onClick={() => exportGraph('svg')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <FileImage className="h-4 w-4 text-emerald-600" /> SVG vector
                </button>
                <button
                  onClick={() => {
                    window.print()
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 text-emerald-600" /> Print / PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 4 Stats Overview Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Accounts</p>
            <p className="mt-0.5 text-xl font-black text-slate-900">{totalAccountsCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Transactions</p>
            <p className="mt-0.5 text-xl font-black text-slate-900">{totalTxCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Fraud Amount</p>
            <p className="mt-0.5 text-xl font-black text-slate-900">₹ {totalAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Maximum Layer</p>
            <p className="mt-0.5 text-xl font-black text-slate-900">{maxLayer}</p>
          </div>
        </div>
      </div>

      {/* Interactive Layer Selection & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-3 text-xs font-bold text-slate-600 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase text-slate-400 mr-1">Highlight Trail:</span>
          {[
            { label: 'All Layers', layer: null as number | null, color: '#10B981' },
            { label: 'L0 \u2022 Victim', layer: 0 as number | null, color: '#EF4444' },
            // Dynamically add one button per real layer (1 to maxLayer, excluding final cash-out layer)
            ...Array.from({ length: maxLayer }, (_, i) => i + 1).map((l) => ({
              label: `L${l} \u2022 Layer ${l}`,
              layer: l as number | null,
              color: LAYER_EDGE_COLORS[(l - 1) % LAYER_EDGE_COLORS.length],
            })),
          ].map((item) => {
            const isSelected = selectedLayer === item.layer
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.layer === null) {
                    setSelectedLayer(null)
                    setSelectedNode(null)
                    setSelectedEdge(null)
                  } else {
                    setSelectedLayer(selectedLayer === item.layer ? null : item.layer)
                    setSelectedNode(null)
                    setSelectedEdge(null)
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all text-xs font-bold cursor-pointer border',
                  isSelected
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40 scale-105'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: isSelected ? '#FFFFFF' : item.color }} />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Cash Flow Direction Legend Pills (Visible strictly when a NODE is selected) */}
        {selectedNode && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Inward Cash (Green)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Outward Cash (Red)
            </span>
          </div>
        )}

        {(selectedLayer !== null || selectedNode !== null || selectedEdge !== null) && (
          <button
            onClick={() => {
              setSelectedLayer(null)
              setSelectedNode(null)
              setSelectedEdge(null)
            }}
            className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-xl transition-colors border border-emerald-300 ml-1"
          >
            <X className="h-3.5 w-3.5" /> Reset Highlight
          </button>
        )}
      </div>

      {/* Main Graph Canvas & Right Account Details Sidebar */}
      <div className="grid min-h-[620px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Graph Canvas */}
        <div ref={graphRef} className="relative h-[min(72vh,800px)] min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs p-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => {
              setSelectedNode(node.data.raw)
              setSelectedEdge(null)
            }}
            onEdgeClick={(_, edge) => {
              setSelectedEdge(edge.data)
              setSelectedNode(null)
            }}
            fitView
            fitViewOptions={{ padding: 0.15, minZoom: 0.35, maxZoom: 1.1 }}
            attributionPosition="bottom-right"
            zoomOnScroll={false}
            preventScrolling={false}
            panOnScroll={false}
            onlyRenderVisibleElements
          >
            <Background color="#e2e8f0" gap={22} size={1} />
            <Controls className="rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => (node.id === 'v1' ? '#EF4444' : '#10B981')}
              maskColor="rgba(241, 245, 249, 0.7)"
              className="rounded-xl border border-slate-200 bg-white shadow-xs cursor-grab active:cursor-grabbing"
            />
          </ReactFlow>

          {revealMode && (
            <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 text-xs font-extrabold text-emerald-700 shadow-sm">
              <Layers className="h-4 w-4" /> Layer {revealLevel} of {maxLayer}
              <button
                disabled={revealLevel >= maxLayer}
                onClick={() => setRevealLevel((lvl) => Math.min(maxLayer, lvl + 1))}
                className="ml-2 rounded-lg bg-emerald-500 px-2.5 py-1 text-white shadow-xs disabled:opacity-40"
              >
                Reveal next
              </button>
            </div>
          )}
        </div>

        {/* Right Aside Drawer: Account Details */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          {selectedNode ? (
            <AccountPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onViewTransactions={() => setSearch(selectedNode.account)}
            />
          ) : selectedEdge ? (
            <EdgePanel edge={selectedEdge} onClose={() => setSelectedEdge(null)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-sm font-bold text-slate-900">Account Details</h2>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Select any account or transaction on the graph to inspect details.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Fullscreen Overlay Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Fullscreen Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Network className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-900">Money Trail — Fullscreen Canvas</h2>
                  <p className="text-xs text-slate-500 font-medium">Interactive money trail exploration mode • Press ESC to exit</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  title="Zoom out"
                  onClick={() => document.querySelector<HTMLButtonElement>('.react-flow__controls-zoomout')?.click()}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-xs hover:bg-slate-50 hover:text-emerald-600 cursor-pointer"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  title="Zoom in"
                  onClick={() => document.querySelector<HTMLButtonElement>('.react-flow__controls-zoomin')?.click()}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-xs hover:bg-slate-50 hover:text-emerald-600 cursor-pointer"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  title="Fit graph"
                  onClick={() => document.querySelector<HTMLButtonElement>('.react-flow__controls-fitview')?.click()}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-xs hover:bg-slate-50 hover:text-emerald-600 cursor-pointer"
                >
                  <Focus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all ml-2 cursor-pointer"
                >
                  <Minimize className="h-4 w-4" /> Exit Full Screen
                </button>
              </div>
            </div>

            {/* Fullscreen Body */}
            <div className={cn('grid flex-1 grid-cols-1 gap-3 p-3 overflow-hidden transition-all', (selectedNode || selectedEdge) && 'xl:grid-cols-[minmax(0,1fr)_350px]')}>
              <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={(_, node) => {
                    setSelectedNode(node.data.raw)
                    setSelectedEdge(null)
                  }}
                  onEdgeClick={(_, edge) => {
                    setSelectedEdge(edge.data)
                    setSelectedNode(null)
                  }}
                  fitView
                  fitViewOptions={{ padding: 0.15, minZoom: 0.35, maxZoom: 1.1 }}
                  attributionPosition="bottom-right"
                  zoomOnScroll={false}
                  preventScrolling={false}
                  panOnScroll={false}
                  onlyRenderVisibleElements
                >
                  <Background color="#e2e8f0" gap={22} size={1} />
                  <Controls className="rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs" />
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) => (node.id === 'v1' ? '#EF4444' : '#10B981')}
                    maskColor="rgba(241, 245, 249, 0.7)"
                    className="rounded-xl border border-slate-200 bg-white shadow-xs cursor-grab active:cursor-grabbing"
                  />
                </ReactFlow>
              </div>

              {(selectedNode || selectedEdge) && (
                <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
                  {selectedNode ? (
                    <AccountPanel
                      node={selectedNode}
                      onClose={() => setSelectedNode(null)}
                      onViewTransactions={() => {
                        setIsFullscreen(false)
                        setSearch(selectedNode.account)
                      }}
                    />
                  ) : selectedEdge ? (
                    <EdgePanel edge={selectedEdge} onClose={() => setSelectedEdge(null)} />
                  ) : null}
                </aside>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Transactions Table */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Transactions</h2>
              <p className="text-xs text-slate-500">{transactionRows.length} transactions listed</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..."
                className="w-full sm:w-60 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Layers / Types</option>
              <option value="ACCOUNT_TRANSFER">Account Transfer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-4 w-12">#</th>
                <th className="px-4 py-4 min-w-[160px]">Date &amp; Time</th>
                <th className="px-4 py-4 min-w-[155px]">Source Account</th>
                <th className="px-4 py-4 min-w-[155px]">Destination Account</th>
                <th className="px-4 py-4 min-w-[110px]">Amount</th>
                <th className="px-4 py-4 min-w-[150px]">Type</th>
                <th className="px-4 py-4 w-20">Layer</th>
                <th className="px-4 py-4 min-w-[190px]">UTR / Transaction ID</th>
                <th className="px-4 py-4 min-w-[190px]">Bank (Source → Dest)</th>
                <th className="px-4 py-4 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {transactionRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    setSelectedEdge(row)
                    setSelectedNode(null)
                  }}
                  className="cursor-pointer transition-colors hover:bg-emerald-50/40"
                >
                  <td className="px-4 py-4 font-mono text-slate-400 text-sm">{row.index}</td>
                  <td className="px-4 py-4 font-medium whitespace-nowrap text-slate-600 text-sm">{row.date}</td>
                  <td className="px-4 py-4 font-mono font-bold text-slate-700 text-sm">{row.sourceAccount}</td>
                  <td className="px-4 py-4 font-mono font-bold text-slate-900 text-sm">{row.targetAccount}</td>
                  <td className="px-4 py-4 font-black text-emerald-600 text-sm whitespace-nowrap">{row.amount}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-extrabold text-emerald-700 whitespace-nowrap">
                      {String(row.mode).replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className="inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-black"
                      style={{
                        backgroundColor: `${LAYER_EDGE_COLORS[(Math.max(row.layer, 1) - 1) % LAYER_EDGE_COLORS.length]}20`,
                        color: LAYER_EDGE_COLORS[(Math.max(row.layer, 1) - 1) % LAYER_EDGE_COLORS.length],
                      }}
                    >
                      {row.layer}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-500 text-sm">{row.utr}</td>
                  <td className="px-4 py-4 font-medium text-slate-500 text-sm">{row.bankPair || 'SBI → HDFC'}</td>
                  <td className="px-4 py-4 text-right">
                    <button className="rounded-lg p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// Sidebar Drawer Component for Node Details
function AccountPanel({ node, onClose, onViewTransactions }: { node: any; onClose: () => void; onViewTransactions: () => void }) {
  const layer = Number(node.layer ?? 0)
  const isVictim = layer === 0
  const isFinal = Boolean(node.isFinal || node.isATM)
  const isLeaf = !isFinal && (node.connectedOut === '0' || Number(node.amountOut) === 0)
  const layerTitle = isVictim
    ? 'L0 • Victim Account'
    : isFinal
    ? `L${layer} • Cash-out / Final Account`
    : isLeaf
    ? `L${layer} • Layer ${layer} (End of Trail)`
    : `L${layer} • Layer ${layer}`

  const badgeColor = isVictim
    ? 'bg-red-500'
    : isFinal
    ? 'bg-slate-600'
    : ''

  const badgeStyle = !isVictim && !isFinal ? { backgroundColor: LAYER_EDGE_COLORS[(layer - 1) % LAYER_EDGE_COLORS.length] } : {}

  const netAmount = (node.amountIn || 0) - (node.amountOut || 0)

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-slate-900">Account Details</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selected Account Header Box */}
        <div className="mt-4 flex items-center gap-3">
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs', badgeColor)} style={badgeStyle}>
            <Landmark className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-500">{layerTitle}</span>
            </div>
            <p className="font-mono text-sm font-black text-slate-900">{node.account}</p>
            <p className="text-sm text-slate-500 font-medium">{node.bank}</p>
          </div>
        </div>

        {/* Field Rows */}
        <div className="mt-5 space-y-3 text-sm">
          <DetailRow label="Layer" value={<span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-black text-sm">{layer}</span>} />
          <DetailRow label="Bank Name" value={node.bank} />
          <DetailRow label="Account Number" value={node.account} isMono />
          <DetailRow label="IFSC Code" value={node.ifsc || 'Not available'} isMono />
          <div className="my-1 border-t border-slate-100" />
          <DetailRow
            label="Money Received (In)"
            value={`₹ ${(node.amountIn || 0).toLocaleString('en-IN')}`}
            valueColor="text-emerald-600"
            isBold
          />
          <DetailRow
            label="Money Sent Out"
            value={`₹ ${(node.amountOut || 0).toLocaleString('en-IN')}`}
            valueColor="text-red-600"
            isBold
          />
          <DetailRow
            label="Net Balance Change"
            value={`${netAmount >= 0 ? '+' : ''}₹ ${netAmount.toLocaleString('en-IN')}`}
            valueColor={netAmount >= 0 ? 'text-emerald-700' : 'text-red-700'}
            isBold
            hint={netAmount < 0 ? 'More was sent out than received' : 'More was received than sent'}
          />
          <div className="my-1 border-t border-slate-100" />
          <DetailRow label="Transactions" value={node.txns || 1} />
          <DetailRow label="Connected Accounts" value={node.connectedIn || '1 from Layer'} subValue={node.connectedOut || '2 to Layer'} />

          {node.withdrawals && node.withdrawals.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-purple-600" />
                  Associated Withdrawals ({node.withdrawals.length})
                </span>
                <span className="text-xs font-mono font-black text-purple-900">
                  ₹{Number(node.totalWithdrawalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {node.withdrawals.map((w: any, idx: number) => (
                  <div key={w.id || idx} className="rounded-xl border border-purple-100 bg-purple-50/50 p-2.5 text-[11px]">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="text-purple-700 uppercase text-[10px] font-extrabold">{String(w.withdrawal_type || 'WITHDRAWAL').replace(/_/g, ' ')}</span>
                      <span className="font-mono text-emerald-700 font-bold">₹{Number(w.amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="mt-1 text-slate-500 text-[10px] space-y-0.5">
                      {w.date && <div><span className="font-semibold text-slate-700">Date:</span> {w.date}</div>}
                      {w.bank_name && <div><span className="font-semibold text-slate-700">Bank:</span> {w.bank_name}</div>}
                      {w.utr_rrn && <div><span className="font-semibold text-slate-700">Ref/UTR:</span> {w.utr_rrn}</div>}
                      {w.location && <div className="truncate"><span className="font-semibold text-slate-700">Location:</span> {w.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onViewTransactions}
        className="mt-6 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
      >
        <FileText className="h-4 w-4" /> View Transactions
      </button>
    </div>
  )
}

function EdgePanel({ edge, onClose }: { edge: any; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900">Transaction Details</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Amount Transferred</p>
            <p className="mt-1 text-lg font-black text-emerald-600">{edge.amount}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">UTR / Reference</p>
            <p className="mt-1 font-mono font-bold text-slate-800">{edge.utr}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Transaction Mode</p>
            <p className="mt-1 font-bold text-slate-700">{String(edge.mode).replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Bank Flow</p>
            <p className="mt-1 font-bold text-slate-700">{edge.bankPair}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  subValue,
  hint,
  isMono = false,
  isBold = false,
  valueColor,
}: {
  label: string
  value: any
  subValue?: string
  hint?: string
  isMono?: boolean
  isBold?: boolean
  valueColor?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500 font-semibold shrink-0">{label}</span>
      <div className="text-right">
        <span className={cn('text-slate-800', isMono && 'font-mono font-bold', isBold && 'font-black', valueColor)}>
          {value}
        </span>
        {hint && <p className="text-[11px] text-slate-400 italic mt-0.5">{hint}</p>}
        {subValue && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subValue}</p>}
      </div>
    </div>
  )
}
