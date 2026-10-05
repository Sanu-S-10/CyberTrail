# backend/app/parsers/table_extractor.py
"""
Table Extractor — Extracts tabular data from NCRP Complaint PDFs using pdfplumber,
applying 11-column header mapping for layer transfers and specialized POS/ATM/Cash column mappings.
"""

import io
import logging
from typing import List, Dict, Any
import pdfplumber

logger = logging.getLogger(__name__)

# Column Header Synonyms Map for 11-Column Layer Transfer Table
HEADER_MAPPINGS_11_COL = {
    "account_number": ["account no", "account number", "acc no", "acc_no", "destination account"],
    "bank_name": ["bank name", "bank", "financial institution", "ifsc bank"],
    "branch": ["branch", "branch name", "location"],
    "ifsc": ["ifsc code", "ifsc", "ifsc_code"],
    "account_type": ["account type", "acc type", "type"],
    "holder_name": ["account holder name", "holder name", "name", "beneficiary name"],
    "amount": ["amount transferred", "amount (rs.)", "amount", "txn amount", "fraud amount"],
    "transaction_date": ["transaction date & time", "transaction date", "txn date", "date & time", "date"],
    "utr_rrn": ["utr / rrn / reference no.", "utr", "rrn", "reference no", "ref no", "utr/rrn"],
    "transaction_type": ["transaction mode / type", "transaction mode", "mode", "remarks", "type"]
}

POS_HEADER_MAPPINGS = {
    "from_account": ["source account", "from account", "acc no"],
    "merchant_name": ["merchant name", "mid", "merchant"],
    "terminal_id": ["pos terminal id", "tid", "terminal id"],
    "bank_name": ["bank name", "bank"],
    "amount": ["amount", "txn amount"],
    "transaction_date": ["date & time", "date", "transaction date"],
    "utr_rrn": ["rrn", "ref no", "utr"]
}

class TableExtractor:
    def extract_tables_from_bytes(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extracts all raw tables page-by-page using pdfplumber.
        """
        extracted_tables = []

        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page_idx, page in enumerate(pdf.pages):
                    page_num = page_idx + 1
                    tables = page.extract_tables()

                    for table_idx, table in enumerate(tables):
                        if not table or len(table) < 2:
                            continue  # Skip empty or single-row tables

                        headers = [str(c or "").strip() for c in table[0]]
                        rows = []
                        for r in table[1:]:
                            clean_row = [str(c or "").strip() for c in r]
                            if any(clean_row):
                                rows.append(clean_row)

                        extracted_tables.append({
                            "page_num": page_num,
                            "table_index": table_idx,
                            "headers": headers,
                            "column_count": len(headers),
                            "rows": rows
                        })

        except Exception as e:
            logger.error(f"Error extracting tables with pdfplumber: {e}")

        return extracted_tables

table_extractor = TableExtractor()
