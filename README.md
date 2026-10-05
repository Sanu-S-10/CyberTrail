# CyberTrail — Money Trail Analyzer

CyberTrail is an investigation-support and training application developed for the **Cyber Crime Police, Palakkad**. Its purpose is to improve the understanding of money trails in cyber-fraud cases by converting transaction records into a structured, searchable, and visual flow of funds.

Investigators upload an NCRP complaint document — a **PDF** or an **Excel (`.xlsx`) workbook** — and CyberTrail extracts accounts, transfers, withdrawal events, and the **Layer values printed in the document**, then renders an interactive money-trail graph.

CyberTrail is a temporary analysis tool. It does not authenticate users, retain cases, or replace official investigation, evidence-handling, or reporting procedures.

All fallback sample records are labelled **DEMO DATA — NOT REAL** and live in `frontend/src/demo/demoTrailData.ts`. Demo values are only rendered when an analysis is explicitly flagged as demo data; they can never appear in an uploaded case.

## Supported Files

| Type | Extension | Source used in the UI |
| --- | --- | --- |
| NCRP complaint PDF | `.pdf` | `Source Page N` |
| NCRP workbook | `.xlsx` | `Source Sheet: <sheet name>` |

Legacy `.xls` workbooks are **not** supported — the parser reads `.xlsx` through `openpyxl`. Re-save an `.xls` file as `.xlsx` before uploading.

## Architecture

- `frontend/`: React, Vite, TypeScript, React Flow (`@xyflow/react`)
- `backend/`: FastAPI, PyMuPDF, pdfplumber, openpyxl, NetworkX, ReportLab
- `/api/cases/analyze`: validates and processes one document entirely in request memory
- Temporary analysis results: bounded backend memory only, automatically expired after 30 minutes
- Browser state: React context only; refreshing or starting a new analysis clears the result

No Docker, database, authentication provider, cloud storage, localStorage, or permanent case history is required.

### Two independent pipelines, one normalized model

```
                     ┌─ PDF: pdf_extractor → section_detector → table_extractor → ocr_processor ─┐
upload (.pdf/.xlsx)─┤                                                                             ├─→ normalized analysis model ─→ graph / UI
                     └─ Excel: excel_extractor (sheet classification) ───────────────────────────┘
```

Both pipelines stay separate implementations and normalize into the same analysis model (`case`, `accounts`, `transactions`, `withdrawals`, `other_records`, `graph`). Neither pipeline replaces or merges into the other.

## Excel Workbook Interpretation

- **`Money Transfer to` (and equivalent transfer sheets) is the only authority for Money Trail edges.** A row becomes an account-to-account transfer only when the sheet explicitly describes transfers *and* the row has both a source and a destination account.
- **Withdrawal sheets** (`Withdrawal through ATM`, `Withdrawal through POS`, `Cash Withdrawal through Cheque`, `AEPS`, and similar) always produce **withdrawal/cash-out events**, never transfers.
- **Other sheets** (`Transaction put on hold`, `Others Less Then 500`, `Other`, or any unmatched sheet) are preserved as `other_records` evidence rows. They never create Money Trail edges.
- Withdrawal events are attached to a transfer account only when the account number matches. Matched events appear as connected cash-out nodes in **Show All** and are hidden in **Layers Only**. They never create a layer.

## Layer Model

- **Document layers are authoritative.** The `Layer` value printed in the uploaded document is used exactly as given for both Excel rows and PDF rows. It is never replaced by BFS, graph depth, account depth, or visual position.
- **Transaction layer** is the layer of that transaction's own source row.
- An **account may appear in several documented layers**. All of them are exposed as `document_layers` (a sorted, unique list) on the account and node; `layer` is only the representative value used for positioning.
- Inference is allowed **only** when the source has no Layer value at all, and it is always labelled `inferred` or `unresolved`. Unresolved nodes are displayed as "no NCRP layer in source" and are never promoted to a layer number.
- The graph can therefore contain an edge such as Layer 7 → Layer 6; that is valid source data, not an error. Validation reports only genuine source-data problems (missing layers, malformed rows, duplicate or unresolved relationships).
- The layer filter buttons and the highest displayed layer are derived from the document layers actually present in the uploaded file — nothing is hardcoded, so a workbook containing Layer 1–10 never produces Layer 11+.

## Amounts

| Field | Meaning |
| --- | --- |
| `reported_fraud_amount` | Amount explicitly reported by the complainant in the source (e.g. "Total Fraudulent Amount reported by complainant"). Shows *Not available in source* when the document does not state one. |
| `total_disputed_amount` | Sum of the disputed-amount values calculated from the uploaded transaction rows. |
| `total_fraud_amount` | Source-reported amount (or an investigator-supplied value). Never the disputed total. |

The three values are kept strictly separate and are never relabelled for one another.

## Run Locally

Prerequisites: Node 20+ and Python 3.11+.

Start the backend:

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

In another terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> and upload a PDF or `.xlsx` workbook. The Vite development proxy forwards `/api` requests to `http://localhost:8000`.

## Analysis Pipeline

```text
Upload -> document type detection
       -> PDF:  page text -> OCR fallback -> sections/tables -> transaction parsing
       -> Excel: sheet classification -> Money Transfer to / withdrawal / other sheets
       -> normalization -> data validation -> document-authoritative layer mapping
       -> withdrawal matching -> NetworkX graph -> React Flow
```

Structured transaction fields include accounts, banks, UTR/RRN values, amounts, disputed amounts, dates, transaction type, layer, and the source page or sheet.

## Money Trail Views

- **Layers Only** — the verified document layer structure only.
- **Show All** — additionally shows withdrawal/cash-out events attached to their matching transfer accounts.
- **Full View / Reveal Mode**, layer highlighting, account and edge detail panels, search/filtering, CSV, PNG, SVG, print, and report PDF export.

## Data Quality / Verification

The money-trail view includes a compact, collapsible verification summary: records parsed, transfer accounts, withdrawal events, NCRP layers found, accounts appearing in several layers, accounts without a source layer, transfers without a source layer, and malformed rows. It reports facts and genuine source inconsistencies only — normal NCRP relationships are never flagged.

## Tests and Build

```bash
cd backend
python -m pytest tests -q

cd ../frontend
npx tsc --noEmit
npm run build
```

The `Reference/` PDF and workbook, together with `docs/pdf_structure.md`, are parser reference material only; they are not required for application startup, and none of their values are hardcoded in the application or tests.

## Data Handling

Uploaded bytes are processed in memory and are never written to a database, object store, localStorage, or permanent file. The backend removes expired analysis entries on subsequent requests and exposes a delete endpoint for explicit cleanup.

## Intended Use and Limitations

CyberTrail was created for the Cyber Crime Police, Palakkad, to support training and improve the practical understanding of money-trail analysis. It is intended to help users:

- understand the sequence of transfers in a suspected fraud trail;
- identify accounts and transaction layers that may need further review;
- explain a trail more clearly using a visual representation; and
- connect extracted information to the original source document.

The application is an investigation-support and training aid. It does not accuse or label any individual, determine guilt, provide legal conclusions, or replace official police systems and procedures. Results should be reviewed against the original documents and validated by authorized personnel.