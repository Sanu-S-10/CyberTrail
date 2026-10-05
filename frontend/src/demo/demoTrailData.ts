/**
 * DEMO DATA — NOT REAL.
 *
 * Isolated sample money trail used only by the "Explore Demo Trail" buttons.
 * It is never used when a real uploaded document is analysed: callers must
 * gate on `analysis.demo_data === true` before rendering it.
 */
export const DEMO_LABEL = 'DEMO DATA — NOT REAL'

export type DemoNode = Record<string, any>

// Dataset matching the vertical tree screenshot exactly
export const DEMO_NODES: DemoNode[] = [
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

export const DEMO_EDGES: DemoNode[] = [
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


/** Builds a complete demo analysis object isolated from any uploaded case. */
export function buildDemoAnalysis(): Record<string, any> {
  return {
    analysis_id: 'demo-sample-case',
    expires_in_seconds: 3600,
    case: {
      case_number: 'DEMO-CASE',
      file_name: 'DEMO SAMPLE',
      document_type: 'DEMO',
      total_fraud_amount: null,
      reported_fraud_amount: null,
      total_disputed_amount: null,
      total_transfer_accounts: DEMO_NODES.length,
      withdrawal_event_count: 0,
      total_transactions: DEMO_EDGES.length,
      demo_data: true,
    },
    accounts: [],
    transactions: [],
    withdrawals: [],
    other_records: [],
    sections: [],
    pages: {},
    graph: {
      nodes: DEMO_NODES.map((node) => ({ id: node.id, data: node })),
      edges: DEMO_EDGES,
      document_layers: [1, 2, 3, 4],
      validation: { ok: true, issues: [], notes: [], data_quality: null },
    },
    layers: [0, 1, 2, 3, 4],
    demo_data: true,
  }
}
