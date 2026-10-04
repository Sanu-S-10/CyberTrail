# backend/app/parsers/data_validator.py
"""
Data Validator — Validates normalized transactions against business rules,
flagging incomplete or suspicious items with NEEDS_REVIEW status.
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class DataValidator:
    def validate_transactions(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validates transaction list and flags items that require manual review.
        """
        seen_utrs = set()

        for tx in transactions:
            flags = []
            review_status = "CONFIRMED"

            # Rule 1: Missing Account Number
            if not tx.get("to_account_number") and not tx.get("from_account_number"):
                flags.append("MISSING_ACCOUNT_NUMBER")
                review_status = "NEEDS_REVIEW"

            # Rule 2: Invalid IFSC
            if tx.get("ifsc") and not tx.get("is_ifsc_valid", True):
                flags.append("INVALID_IFSC_CODE")
                review_status = "NEEDS_REVIEW"

            # Rule 3: Missing UTR/RRN
            utr = tx.get("utr_rrn", "").strip()
            if not utr:
                flags.append("MISSING_UTR_RRN")
                review_status = "NEEDS_REVIEW"
            else:
                # Rule 4: Duplicate Transaction UTR
                if utr in seen_utrs:
                    flags.append("DUPLICATE_UTR_RRN")
                    review_status = "NEEDS_REVIEW"
                else:
                    seen_utrs.add(utr)

            # Rule 5: Non-positive Amount
            amount = tx.get("amount", 0.0)
            if amount <= 0:
                flags.append("INVALID_TRANSACTION_AMOUNT")
                review_status = "NEEDS_REVIEW"

            tx["is_flagged"] = len(flags) > 0
            tx["validation_flags"] = flags
            tx["review_status"] = review_status

        return transactions

data_validator = DataValidator()
