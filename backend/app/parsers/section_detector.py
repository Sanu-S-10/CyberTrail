# backend/app/parsers/section_detector.py
"""
Section Detector — Identifies complaint sections, layer markers ("Layer : N"),
and table categories (Layer Transfers, ATM, POS, Cash).
"""

import re
from typing import List, Dict, Any, Optional

# Regex patterns for section & layer detection
LAYER_PATTERN = re.compile(r'layer\s*[:\-]?\s*(\d+)', re.IGNORECASE)
SECTION_TYPES = {
    "ACCOUNT_TRANSFER": re.compile(r'(money\s+transfer|account\s+transfer|layer\s+transfer|fund\s+transfer)', re.IGNORECASE),
    "ATM_WITHDRAWAL": re.compile(r'(atm\s+withdrawal|atm\_wdr|atm\s+transaction)', re.IGNORECASE),
    "CASH_WITHDRAWAL": re.compile(r'(cash\s+withdrawal|cash\s+wdr|counter\s+cash|branch\s+cash)', re.IGNORECASE),
    "POS_WITHDRAWAL": re.compile(r'(pos\s+withdrawal|pos\s+purchase|point\s+of\s+sale|merchant\s+pos)', re.IGNORECASE),
}

class SectionDetector:
    def detect_sections(self, page_texts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Scans lines across pages to find section headers and layer markers.
        """
        sections = []
        current_layer: Optional[int] = None

        for page in page_texts:
            page_num = page["page_num"]
            lines = page["lines"]

            for line in lines:
                # Check for "Layer : N" marker
                layer_match = LAYER_PATTERN.search(line)
                if layer_match:
                    current_layer = int(layer_match.group(1))

                # Check for section category
                for sec_type, pattern in SECTION_TYPES.items():
                    if pattern.search(line):
                        sections.append({
                            "page_num": page_num,
                            "section_type": sec_type,
                            "layer": current_layer,
                            "header_text": line,
                            "raw_source_text": line
                        })

        return sections

section_detector = SectionDetector()
