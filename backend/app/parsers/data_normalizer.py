# backend/app/parsers/data_normalizer.py
"""
Data Normalizer — Normalizes extracted transaction dates, amounts (lakh notation, currency symbols),
IFSC codes, and deduplicates accounts.
"""

import re
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

IFSC_REGEX = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')

class DataNormalizer:
    def normalize_amount(self, raw_amount: str) -> float:
        """
        Parses raw amount strings into float.
        Handles: "Rs. 2,50,000", "₹1,50,000.00", "2.5 Lakhs".
        """
        if not raw_amount:
            return 0.0

        clean_str = str(raw_amount).strip().lower()
        # Remove currency words/symbols like rs, rs., ₹, INR, commas
        clean_str = re.sub(r'(rs\.?|₹|inr|,|\s)', '', clean_str)

        # Handle Lakh / Lakhs notation (e.g., "2.5 lakhs" -> 250000)
        lakh_match = re.search(r'([\d\.]+)\s*lakh', clean_str)
        if lakh_match:
            try:
                val = float(lakh_match.group(1))
                return val * 100000.0
            except ValueError:
                pass

        try:
            return float(clean_str)
        except ValueError:
            logger.warning(f"Could not parse amount string: '{raw_amount}'")
            return 0.0


    def normalize_date(self, raw_date: str) -> Optional[str]:
        """
        Parses multi-format date strings into standard ISO 8601 string.
        Supported formats:
        - DD/MM/YYYY HH:MM:SS
        - DD-MM-YYYY HH:MM:SS AM/PM
        - YYYY-MM-DDTHH:MM:SS
        """
        if not raw_date:
            return datetime.utcnow().isoformat()

        clean_date = re.sub(r"\s+", " ", str(raw_date).strip())
        clean_date = re.sub(r":(AM|PM)\b", r" \1", clean_date, flags=re.IGNORECASE)
        clean_date = re.sub(r"\b(\d{2}):([0-5]\d)\s*(AM|PM)\b", lambda match: f"{match.group(1)}:{match.group(2)}" if int(match.group(1)) > 12 else match.group(0), clean_date, flags=re.IGNORECASE)
        clean_date = re.sub(r"\s+", " ", clean_date).strip()

        date_formats = [
            "%d/%m/%Y %I:%M:%S %p",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%d-%m-%Y %H:%M:%S",
            "%d-%m-%Y %I:%M:%S %p",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%Y-%m-%d"
        ]

        for fmt in date_formats:
            try:
                dt = datetime.strptime(clean_date, fmt)
                return dt.isoformat()
            except ValueError:
                continue

        logger.warning(f"Could not parse date format for: '{raw_date}'. Preserving source value.")
        return clean_date or None

    def normalize_ifsc(self, raw_ifsc: str) -> Tuple[str, bool]:
        """
        Cleans and validates IFSC format. Returns (normalized_ifsc, is_valid).
        """
        if not raw_ifsc:
            return "", False

        clean_ifsc = str(raw_ifsc).strip().upper()
        clean_ifsc = re.sub(r'[^A-Z0-9]', '', clean_ifsc)

        is_valid = bool(IFSC_REGEX.match(clean_ifsc))
        return clean_ifsc, is_valid

    def normalize_transaction(self, tx: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes all fields of a parsed transaction object.
        """
        tx["amount"] = self.normalize_amount(tx.get("raw_amount", "0"))
        tx["transaction_date"] = self.normalize_date(tx.get("raw_date", ""))
        
        ifsc_code, is_valid_ifsc = self.normalize_ifsc(tx.get("ifsc", ""))
        tx["ifsc"] = ifsc_code
        tx["is_ifsc_valid"] = is_valid_ifsc

        tx["to_account_number"] = str(tx.get("to_account_number", "")).strip()
        tx["bank_name"] = str(tx.get("bank_name", "")).strip()
        tx["utr_rrn"] = str(tx.get("utr_rrn", "")).strip().upper()

        return tx

data_normalizer = DataNormalizer()
