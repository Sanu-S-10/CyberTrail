// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Mask an account number — always done server-side, this is display-only. */
export function maskAccount(account: string): string {
  if (!account || account.length < 4) return account
  return 'XXXX' + account.slice(-4)
}

/** Format INR amount with Indian numbering system */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Format a date string to readable format */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/** Get layer colour class for badges */
export function getLayerColor(layer: number | null): string {
  const map: Record<number, string> = {
    0: 'text-accent bg-accent-subtle border-emerald-200',
    1: 'text-violet-700 bg-violet-50 border-violet-200',
    2: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    3: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    4: 'text-amber-700 bg-amber-50 border-amber-200',
    5: 'text-red-700 bg-red-50 border-red-200',
  }
  if (layer === null) return 'text-slate-400 bg-slate-800 border-slate-600'
  return map[layer] ?? 'text-slate-400 bg-slate-800 border-slate-600'
}
