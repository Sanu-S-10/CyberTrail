# CyberTrail — Money Trail Analyzer

CyberTrail is an investigation-support and training application developed for the **Cyber Crime Police, Palakkad**. Its purpose is to improve the understanding of money trails in cyber-fraud cases by converting transaction records into a structured, searchable, and visual flow of funds.

Investigators can upload a transaction PDF, identify accounts and transfers, follow the movement of money across multiple layers, and inspect the supporting source page for each transaction. The application is designed to make complex financial trails easier to understand during analysis, discussion, and training.

CyberTrail is a temporary analysis tool. It does not authenticate users, retain cases, or replace official investigation, evidence-handling, or reporting procedures.

All fallback development records are labelled **DEMO DATA - NOT REAL**.

## What the Application Provides

- Upload and validate a transaction PDF
- Extract transaction and account details, including account numbers, banks, UTR/RRN values, amounts, dates, transaction types, layers, and source pages
- Detect and normalize transaction tables, with OCR fallback for scanned documents
- Build an interactive money-trail graph showing the flow of funds between accounts
- Use Full View and Reveal Mode to understand direct transfers and layered movement
- Search and filter transactions by text, layer, and transaction type
- Open the source page associated with a graph edge or transaction
- Export findings as CSV, PNG, SVG, print output, or a report PDF

The interface is intended to support clearer conversations about how money moves through accounts, where layers are introduced, and which transactions require closer examination.

## Architecture

- `frontend/`: React, Vite, TypeScript, React Flow
- `backend/`: FastAPI, PyMuPDF, pdfplumber, NetworkX, ReportLab
- `/api/cases/analyze`: validates and processes one PDF in request memory
- Temporary analysis results: bounded backend memory only, automatically expired after 30 minutes
- Browser state: React context only; refreshing or starting a new analysis clears the result

No Docker, database, authentication provider, cloud storage, localStorage, or permanent case history is required.

## Run Locally

Prerequisites: Node 20+ and Python 3.11+.

Start the backend:

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In another terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> and upload a PDF. The Vite development proxy forwards `/api` requests to `http://localhost:8000`.

## Analysis Pipeline

```text
Upload -> PDF inspection -> page text extraction -> OCR fallback
       -> section/table detection -> transaction parsing -> normalization
       -> validation -> layer inference -> NetworkX graph -> React Flow
```

Structured transaction fields include accounts, banks, UTR/RRN values, amounts, dates, transaction type, layer, and source page. Clicking graph edges exposes the relevant source PDF page, helping users connect the visual trail back to the original record.

## Export and Verification

The money-trail view supports:

- Browser print and print-to-PDF
- PNG export
- SVG export
- Report PDF export
- Transaction search, layer/type filtering, and CSV export

## Tests and Build

```bash
cd backend
pytest tests/ -v

cd ../frontend
npm run build
```

The `Reference/` PDF and spreadsheet, together with `docs/pdf_structure.md`, are parser reference material only; they are not required for application startup.

## Data Handling

Uploaded bytes are processed in memory and are never written to a database, object store, localStorage, or permanent file. The backend removes expired analysis entries on subsequent requests and exposes a delete endpoint for explicit cleanup.

## Intended Use and Limitations

CyberTrail was created for the Cyber Crime Police, Palakkad, to support training and improve the practical understanding of money-trail analysis. It is intended to help users:

- understand the sequence of transfers in a suspected fraud trail;
- identify accounts and transaction layers that may need further review;
- explain a trail more clearly using a visual representation; and
- connect extracted information to the original source document.

The application is an investigation-support and training aid. It does not accuse or label any individual, determine guilt, provide legal conclusions, or replace official police systems and procedures. Results should be reviewed against the original documents and validated by authorized personnel.
