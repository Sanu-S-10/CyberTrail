# backend/app/parsers/extraction_orchestrator.py
"""
Extraction Orchestrator — Coordinates text extraction, per-page OCR fallback,
section detection, and table extraction for complaint PDFs.
"""

import logging
from typing import Dict, Any

from app.parsers.pdf_extractor import pdf_extractor
from app.parsers.section_detector import section_detector
from app.parsers.table_extractor import table_extractor
from app.parsers.ocr_processor import ocr_processor

logger = logging.getLogger(__name__)

class ExtractionOrchestrator:
    def process_pdf(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Processes complaint PDF bytes end-to-end through extraction stages.
        """
        # Stage 1: Inspect PDF structure
        meta = pdf_extractor.inspect_pdf(pdf_bytes)
        logger.info(f"Inspected PDF: {meta['page_count']} pages, primarily scanned={meta['is_primarily_scanned']}")

        # Stage 2: Extract text per page
        page_texts = pdf_extractor.extract_page_texts(pdf_bytes)

        # Stage 3: OCR Fallback for sparse / scanned pages
        ocr_results = []
        for page in meta["pages"]:
            if page["is_scanned"]:
                logger.info(f"Page {page['page_num']} detected as sparse/scanned. Triggering OCR fallback...")
                ocr_out = ocr_processor.process_scanned_page(pdf_bytes, page["page_num"])
                ocr_results.append(ocr_out)
                if ocr_out.get("ocr_applied") and ocr_out.get("raw_text"):
                    target_page = page_texts[page["page_num"] - 1]
                    target_page["raw_text"] = f'{target_page["raw_text"]}\n{ocr_out["raw_text"]}'
                    target_page["lines"] = [line.strip() for line in target_page["raw_text"].split("\n") if line.strip()]

        # Stage 4: Detect sections & Layer : N markers
        sections = section_detector.detect_sections(page_texts)

        # Stage 5: Extract tables with 11-column & POS mapping
        tables = table_extractor.extract_tables_from_bytes(pdf_bytes)

        return {
            "metadata": meta,
            "page_texts": page_texts,
            "ocr_results": ocr_results,
            "sections": sections,
            "tables": tables,
            "extracted_raw_elements_count": len(tables) + len(sections)
        }

extraction_orchestrator = ExtractionOrchestrator()
