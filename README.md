# CyberTrail — Money Trail Analyzer

Temporary PDF processing tool for Cyber Cell training and analysis. Upload a PDF, extract transactions and accounts, inspect the Full View or Reveal Mode money-flow graph, and export the result. This tool does not authenticate users or retain cases.

All fallback development records are labelled **DEMO DATA - NOT REAL**.

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

## PDF Pipeline

```text
Upload -> PDF inspection -> page text extraction -> OCR fallback
       -> section/table detection -> transaction parsing -> normalization
       -> validation -> layer inference -> NetworkX graph -> React Flow
```

Structured transaction fields include accounts, banks, UTR/RRN values, amounts, dates, transaction type, layer, and source page. Clicking graph edges exposes the source PDF page.

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

The `Reference/` PDF and `docs/pdf_structure.md` are parser reference material only; they are not required for application startup.

## Data Handling

Uploaded bytes are processed in memory and are never written to a database, object store, localStorage, or permanent file. The backend removes expired analysis entries on subsequent requests and exposes a delete endpoint for explicit cleanup.

This is an investigation support and training tool. It does not accuse or label any individual.
