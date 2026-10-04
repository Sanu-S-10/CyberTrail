"""Real per-page OCR fallback with explicit unavailable-engine reporting."""

from __future__ import annotations

import io
import logging
from typing import Any

import fitz

logger = logging.getLogger(__name__)

try:
    import pytesseract
    from PIL import Image
except ImportError:
    pytesseract = None
    Image = None


class OCRProcessor:
    def process_scanned_page(self, pdf_bytes: bytes, page_num: int) -> dict[str, Any]:
        if pytesseract is None or Image is None:
            return {
                "page_num": page_num,
                "raw_text": "",
                "confidence": 0.0,
                "ocr_applied": False,
                "lines": [],
                "error": "Tesseract OCR is not installed; scanned page was not guessed or fabricated.",
            }

        document = fitz.open(stream=pdf_bytes, filetype="pdf")
        try:
            page = document[page_num - 1]
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
            image = Image.open(io.BytesIO(pixmap.tobytes("png")))
            text = pytesseract.image_to_string(image, config="--psm 6")
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            return {
                "page_num": page_num,
                "raw_text": text,
                "confidence": 0.0,
                "ocr_applied": True,
                "lines": lines,
            }
        finally:
            document.close()


ocr_processor = OCRProcessor()
