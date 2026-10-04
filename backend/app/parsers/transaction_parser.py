"""Parse NCRP transaction tables while preserving document values and source pages."""

from __future__ import annotations

import re
from typing import Any

from app.parsers.account_identity import (
    clean_text,
    display_bank,
    layer_from_text,
    parse_destination_account_cell,
    parse_source_account_cell,
)


def _clean(value: Any) -> str:
    return clean_text(value)


def _first_line(value: Any) -> str:
    return _clean(str(value or "").splitlines()[0] if str(value or "").splitlines() else "")


def _utr_from_account_cell(value: Any) -> str:
    _, utr = parse_source_account_cell(value)
    return utr


def _is_header_row(row: list[str]) -> bool:
    joined = " ".join(row).lower()
    return any(
        token in joined
        for token in ("transaction amount", "account no", "withdrawal amount", "s no.", "bank /fis", "bank/fis")
    ) and not str(row[0] if row else "").strip().isdigit()


def _is_money_transfer_context(title: str, row: list[str]) -> bool:
    joined = f"{title} {' '.join(row[:3])}".lower()
    if "money transfer" in joined:
        return True
    if layer_from_text(row[2] if len(row) > 2 else ""):
        return True
    return False


class TransactionParser:
    def parse_raw_tables(self, tables: list[dict[str, Any]], default_case_id: str = "") -> list[dict[str, Any]]:
        transactions: list[dict[str, Any]] = []
        for table in tables:
            header_values = [_clean(value).lower() for value in table.get("headers", [])]
            title = header_values[0] if header_values else ""
            rows = [
                [re.sub(r"[ \t]+", " ", re.sub(r"[\uE000-\uF8FF]", "", str(cell or ""))).strip() for cell in row]
                for row in table.get("rows", [])
            ]
            if not rows or "victim account" in title or "national id" in title or "supporting evidence" in title or title in {"file name", "action taken by bank view complete trail"}:
                continue
            if any("description" in value for value in header_values) and any("amount" in value for value in header_values):
                continue
            if title in {"s.no.", "s no."} and any("withdrawal through" in cell.lower() for cell in rows[0]):
                continue
            raw_headers = table.get("headers", [])
            if raw_headers and str(raw_headers[0]).strip().isdigit():
                rows.insert(0, [re.sub(r"[ \t]+", " ", re.sub(r"[\uE000-\uF8FF]", "", str(cell or ""))).strip() for cell in raw_headers])
                title = ""
            if any("description" in cell.lower() for cell in rows[0]) and any("amount" in cell.lower() for cell in rows[0]):
                continue
            if _is_header_row(rows[0]):
                title = title or " ".join(rows[0]).lower()
                rows = rows[1:]
            section_title = title
            for row in rows:
                if not row or not str(row[0]).strip().isdigit():
                    # Section title rows inside a continuation table (ATM / Other / POS)
                    joined = " ".join(row).lower()
                    if "withdrawal through" in joined or "cash withdrawal" in joined or joined.strip() in {"other", "others"}:
                        section_title = joined
                    continue
                transaction = self._parse_row(section_title, row, table.get("page_num", 1), default_case_id)
                if transaction:
                    transactions.append(transaction)
        return transactions

    def _base(self, row: list[str], page_num: int, case_id: str, transaction_type: str) -> dict[str, Any]:
        return {
            "case_id": case_id,
            "source_page": page_num,
            "raw_source_text": " | ".join(row),
            "review_status": "PENDING",
            "is_flagged": False,
            "transaction_type": transaction_type,
        }

    def _parse_row(self, title: str, row: list[str], page_num: int, case_id: str) -> dict[str, Any] | None:
        joined_title = (title + " " + " ".join(row[:2])).lower()

        if _is_money_transfer_context(title, row) and len(row) >= 7:
            return self._parse_transfer_row(row, page_num, case_id)

        if len(row) > 10 and any("place of atm" in cell.lower() for cell in row):
            tx = self._base(row, page_num, case_id, "ATM_WITHDRAWAL")
            location = next((cell for cell in row if "place of atm" in cell.lower()), "")
            atm_match = re.search(r"ATM ID\s*[:-]\s*([^\s]+)", location, re.IGNORECASE)
            from_acc, from_utr = parse_source_account_cell(row[1] if len(row) > 1 else "")
            tx.update({
                "from_account_number": from_acc,
                "to_account_number": f"ATM-{atm_match.group(1)}" if atm_match else "ATM_TERMINAL",
                "bank_name": _clean((row[-2] if len(row) > 1 else "").replace("\n", " ")),
                "raw_amount": row[5] if len(row) > 5 else "",
                "raw_date": row[3] if len(row) > 3 else "",
                "utr_rrn": row[8] if len(row) > 8 else from_utr,
                "account_type": "ATM",
            })
            return tx
        if "cash withdrawal" in joined_title or "cheque" in joined_title:
            tx = self._base(row, page_num, case_id, "CASH_WITHDRAWAL")
            from_acc, from_utr = parse_source_account_cell(row[1] if len(row) > 1 else "")
            tx.update({
                "from_account_number": from_acc,
                "to_account_number": "CASH_COUNTER",
                "bank_name": _clean((row[18] if len(row) > 18 else "").replace("\n", " ")),
                "raw_amount": row[9] if len(row) > 9 else "",
                "raw_date": row[7] if len(row) > 7 else "",
                "utr_rrn": from_utr,
                "account_type": "CASH",
            })
            return tx
        if "withdrawal through atm" in joined_title or ("atm" in joined_title and "money transfer" not in joined_title):
            tx = self._base(row, page_num, case_id, "ATM_WITHDRAWAL")
            location = row[6] if len(row) > 6 else ""
            atm_match = re.search(r"ATM ID\s*[:-]\s*([^\s]+)", location, re.IGNORECASE)
            from_acc, from_utr = parse_source_account_cell(row[1] if len(row) > 1 else "")
            tx.update({
                "from_account_number": from_acc,
                "to_account_number": f"ATM-{atm_match.group(1)}" if atm_match else "ATM_TERMINAL",
                "bank_name": _clean((row[7] if len(row) > 7 else "").replace("\n", " ")),
                "raw_amount": row[3] if len(row) > 3 else "",
                "raw_date": row[2] if len(row) > 2 else "",
                "utr_rrn": from_utr,
                "account_type": "ATM",
            })
            return tx
        if "pos" in joined_title or "merchant" in joined_title:
            tx = self._base(row, page_num, case_id, "POS_WITHDRAWAL")
            from_acc, from_utr = parse_source_account_cell(row[1] if len(row) > 1 else "")
            tx.update({
                "from_account_number": from_acc,
                "to_account_number": row[2] if len(row) > 2 else "POS_MERCHANT",
                "bank_name": row[4] if len(row) > 4 else "",
                "raw_amount": row[5] if len(row) > 5 else "",
                "raw_date": row[6] if len(row) > 6 else "",
                "utr_rrn": row[7] if len(row) > 7 else from_utr,
                "account_type": "POS",
            })
            return tx
        if len(row) >= 7 and not any(token in joined_title for token in ("withdrawal", "cheque", "atm", "pos", "other")):
            return self._parse_transfer_row(row, page_num, case_id)
        return None

    def _parse_transfer_row(self, row: list[str], page_num: int, case_id: str) -> dict[str, Any] | None:
        from_acc, from_utr = parse_source_account_cell(row[1] if len(row) > 1 else "")
        to_acc, ifsc = parse_destination_account_cell(row[3] if len(row) > 3 else "")
        if not from_acc and not to_acc:
            return None
        bank_value = row[2] if len(row) > 2 else ""
        source_bank = display_bank(row[9] if len(row) > 9 else "")
        tx = self._base(row, page_num, case_id, "ACCOUNT_TRANSFER")
        tx.update({
            "from_account_number": from_acc,
            "to_account_number": to_acc,
            "bank_name": display_bank(bank_value),
            "to_bank_name": display_bank(bank_value),
            "from_bank_name": source_bank,
            "raw_layer_from_doc": layer_from_text(bank_value),
            "ifsc": ifsc or _clean((row[3].splitlines()[1] if len(row) > 3 and len(row[3].splitlines()) > 1 else "")),
            "raw_amount": row[6] if len(row) > 6 else "",
            "raw_date": row[5] if len(row) > 5 else "",
            "utr_rrn": _clean((row[4] if len(row) > 4 else "") or from_utr).replace("\n", ""),
            "raw_type": _clean(row[8] if len(row) > 8 else ""),
        })
        return tx


transaction_parser = TransactionParser()
