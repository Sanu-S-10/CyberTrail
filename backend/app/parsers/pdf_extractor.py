# backend/app/parsers/pdf_extractor.py
"""
PDF Extractor — Detects text-searchable vs scanned PDFs, extracts page text,
and coordinates table & OCR extraction.
"""

import logging
from typing import Dict, Any, List
import fitz  # PyMuPDF

import pdfplumber

logger = logging.getLogger(__name__)

class PDFExtractor:
    def __init__(self):
        pass

    def inspect_pdf(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Inspects PDF bytes and determines page count, text searchability, and structure.
        """
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            logger.error(f"Failed to open PDF document: {e}")
            raise ValueError(f"Corrupted or invalid PDF file: {e}")

        if doc.is_encrypted:
            raise ValueError("Password-protected PDF files are not supported. Please remove protection and try again.")

        page_count = len(doc)
        pages_meta = []
        total_text_length = 0

        for idx, page in enumerate(doc):
            text = page.get_text("text") or ""
            text_len = len(text.strip())
            total_text_length += text_len
            
            # A page with less than 50 chars of text is flagged as sparse / potentially scanned
            is_scanned = text_len < 50
            pages_meta.append({
                "page_num": idx + 1,
                "text_length": text_len,
                "is_scanned": is_scanned,
                "sample_text": text[:150]
            })

        avg_text_per_page = total_text_length / max(1, page_count)
        is_primarily_scanned = avg_text_per_page < 100

        doc.close()

        return {
            "page_count": page_count,
            "total_text_length": total_text_length,
            "avg_text_per_page": avg_text_per_page,
            "is_primarily_scanned": is_primarily_scanned,
            "pages": pages_meta
        }

    def extract_page_texts(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extracts full text per page along with line-by-line metadata.
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        results = []

        for idx, page in enumerate(doc):
            text = page.get_text("text") or ""
            results.append({
                "page_num": idx + 1,
                "raw_text": text,
                "lines": [line.strip() for line in text.split("\n") if line.strip()]
            })

        doc.close()
        return results

pdf_extractor = PDFExtractor()
