"""Stateless PDF & Excel analysis service with bounded in-memory results."""

from __future__ import annotations

import re
import time
import uuid
from typing import Any

from app.parsers.account_identity import account_id_for, display_bank, normalize_account
from app.parsers.data_normalizer import data_normalizer
from app.parsers.data_validator import data_validator
from app.parsers.excel_extractor import excel_extractor
from app.parsers.extraction_orchestrator import extraction_orchestrator
from app.parsers.transaction_parser import transaction_parser
from app.services.graph_builder import graph_builder
from app.services.layer_analyzer import layer_analyzer
from app.services.trail_assembly import assemble_trail

RESULT_TTL_SECONDS = 30 * 60
_results: dict[str, tuple[float, dict[str, Any]]] = {}


def _cleanup() -> None:
    now = time.monotonic()
    expired = [key for key, (expires, _) in _results.items() if expires <= now]
    for key in expired:
        _results.pop(key, None)


def _extract_victim_metadata(tables: list[dict[str, Any]]) -> tuple[str, str, float]:
    for table in tables:
        headers = table.get("headers", [])
        title = str(headers[0] if headers else "").lower()
        if "victim account" not in title:
            continue
        rows = table.get("rows", [])
        if len(rows) < 2:
            continue
        header_row = [str(value or "").lower() for value in rows[0]]
        data_row = rows[1]
        account_index = next((index for index, value in enumerate(header_row) if "account" in value or "wallet" in value), 1)
        bank_index = next((index for index, value in enumerate(header_row) if "bank" in value or "merchant" in value), len(data_row) - 1)
        bank = display_bank(data_row[bank_index])
        amount_index = next((index for index, value in enumerate(header_row) if "transaction amount" in value), -1)
        total = sum(data_normalizer.normalize_amount(row[amount_index]) for row in rows[1:] if amount_index >= 0 and len(row) > amount_index)
        return normalize_account(data_row[account_index]), bank, total
    return "", "", 0.0


def _build_analysis(raw: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    raw_parsed = [data_normalizer.normalize_transaction(tx) for tx in transaction_parser.parse_raw_tables(raw["tables"])]
    pdf_victim_account, pdf_victim_bank, pdf_total_amount = _extract_victim_metadata(raw["tables"])
    victim_account = metadata.get("victim_account", "") or pdf_victim_account
    victim_bank = metadata.get("victim_bank", "") or pdf_victim_bank or "Unknown bank"
    extracted_total = float(metadata.get("total_fraud_amount") or pdf_total_amount)
    total_fraud_amount = extracted_total if extracted_total > 0 else None

    # Separate transfers from withdrawal records
    parsed_transfers = []
    pdf_withdrawals = []
    for tx in raw_parsed:
        if tx.get("transaction_type") in ("ATM_WITHDRAWAL", "POS_WITHDRAWAL", "CASH_WITHDRAWAL"):
            pdf_withdrawals.append(tx)
        else:
            parsed_transfers.append(tx)

    accounts_by_number: dict[str, dict[str, Any]] = {}

    def ensure_account(number: str, bank: str, holder: str = "", account_type: str = "SAVINGS") -> dict[str, Any]:
        clean_number = (number or "UNKNOWN").strip()
        if clean_number not in accounts_by_number:
            accounts_by_number[clean_number] = {
                "id": account_id_for(clean_number),
                "account_number": clean_number,
                "bank_name": bank or "Unknown bank",
                "ifsc": "",
                "holder_name": holder or "Unidentified account holder",
                "account_type": account_type,
                "layer": 0 if clean_number == victim_account else None,
                "layer_source": "DOCUMENT",
                "is_suspicious": clean_number != victim_account,
                "withdrawals": [],
                "withdrawal_count": 0,
                "total_withdrawal_amount": 0.0,
            }
        return accounts_by_number[clean_number]

    if victim_account:
        ensure_account(victim_account, victim_bank, metadata.get("victim_name", "Victim"))

    for index, tx in enumerate(parsed_transfers, start=1):
        source_number = tx.get("from_account_number") or victim_account
        target_number = tx.get("to_account_number") or f"UNRESOLVED-{index}"
        source = ensure_account(source_number, tx.get("bank_name", ""))
        target = ensure_account(target_number, tx.get("bank_name", ""), tx.get("holder_name", ""), tx.get("account_type", "SAVINGS"))
        if tx.get("ifsc"):
            target["ifsc"] = tx["ifsc"]
        if tx.get("raw_layer_from_doc") is not None:
            target["raw_layer_from_doc"] = tx["raw_layer_from_doc"]
            target["layer"] = tx["raw_layer_from_doc"]
        tx.update({
            "id": f"transaction-{index}",
            "from_account_id": source["id"],
            "to_account_id": target["id"],
            "from_account_number": source_number,
            "to_account_number": target_number,
            "status": tx.get("review_status", "PENDING"),
        })

    accounts = list(accounts_by_number.values())
    parsed_transfers = data_validator.validate_transactions(parsed_transfers)
    accounts = layer_analyzer.analyze_layers(accounts, parsed_transfers, victim_account)
    account_layers = {account["id"]: account.get("layer") for account in accounts}
    for tx in parsed_transfers:
        doc_l = tx.get("raw_layer_from_doc")
        if doc_l is not None:
            tx["layer"] = doc_l
            tx["layer_source"] = "document"
        else:
            inferred_l = account_layers.get(tx.get("to_account_id"))
            tx["layer"] = inferred_l
            tx["layer_source"] = "inferred" if inferred_l is not None else "unknown"

    # Associate PDF withdrawal events with matching accounts, exposing each
    # cash-out event as a connected account node for SHOW ALL.
    associated_withdrawals = []
    cashout_txs = []
    for idx, w in enumerate(pdf_withdrawals, start=1):
        acc_num = (w.get("from_account_number") or "").strip()
        matched_acc = accounts_by_number.get(acc_num)
        if matched_acc:
            w_obj = {
                "id": f"withdrawal-pdf-{idx}",
                "account_id": matched_acc["id"],
                "account_number": matched_acc["account_number"],
                "withdrawal_type": w.get("transaction_type", "WITHDRAWAL"),
                "amount": float(w.get("amount", 0.0)),
                "raw_amount": str(w.get("raw_amount", w.get("amount", ""))),
                "date": w.get("raw_date") or "",
                "bank_name": w.get("bank_name") or matched_acc.get("bank_name", ""),
                "utr_rrn": w.get("utr_rrn", ""),
                "location": w.get("to_account_number", ""),
                "remarks": w.get("raw_source_text", ""),
                "layer": matched_acc.get("layer"),
            }
            matched_acc["withdrawals"].append(w_obj)
            matched_acc["withdrawal_count"] += 1
            matched_acc["total_withdrawal_amount"] += w_obj["amount"]
            associated_withdrawals.append(w_obj)

            kind = str(w.get("transaction_type") or "ATM_WITHDRAWAL").upper()
            acc_type = "ATM" if "ATM" in kind else ("POS" if "POS" in kind else "CASH")
            cashout_number = f"{acc_type}-{matched_acc['account_number']}-{idx}"
            cashout_acc = {
                "id": account_id_for(cashout_number),
                "account_number": cashout_number,
                "bank_name": w_obj["bank_name"] or matched_acc.get("bank_name", ""),
                "ifsc": "",
                "holder_name": w_obj["location"] or f"{acc_type} cash-out",
                "account_type": acc_type,
                "layer": matched_acc.get("layer"),
                "layer_source": "cashout",
                "is_suspicious": False,
                "withdrawals": [],
                "withdrawal_count": 0,
                "total_withdrawal_amount": 0.0,
            }
            accounts.append(cashout_acc)
            cashout_txs.append({
                "id": f"cashout-tx-{idx}",
                "from_account_number": matched_acc["account_number"],
                "to_account_number": cashout_number,
                "from_account_id": matched_acc["id"],
                "to_account_id": cashout_acc["id"],
                "amount": w_obj["amount"],
                "raw_amount": w_obj["raw_amount"],
                "disputed_amount": 0.0,
                "transaction_date": w_obj["date"],
                "raw_date": w_obj["date"],
                "utr_rrn": w_obj["utr_rrn"],
                "transaction_type": kind,
                "bank_name": w_obj["bank_name"],
                "layer": matched_acc.get("layer"),
                "status": "RESOLVED",
                "review_status": "RESOLVED",
            })

    graph = graph_builder.build_networkx_graph(accounts, parsed_transfers + cashout_txs)
    return {
        "case": {
            "id": metadata["analysis_id"],
            "case_number": metadata["case_number"],
            "victim_name": metadata.get("victim_name", ""),
            "victim_account": victim_account,
            "victim_bank": victim_bank,
            "total_fraud_amount": total_fraud_amount,
            "file_name": metadata["file_name"],
            "document_type": "PDF",
            "demo_data": False,
            "total_accounts": len(accounts),
            "total_transactions": len(parsed_transfers),
        },
        "accounts": accounts,
        "transactions": parsed_transfers,
        "withdrawals": associated_withdrawals,
        "graph": graph,
        "layers": sorted({a.get("layer") for a in accounts if a.get("layer") is not None}),
        "pages": raw["metadata"],
        "sections": raw["sections"],
        "demo_data": False,
    }


def analyze_pdf(pdf_bytes: bytes, metadata: dict[str, Any]) -> dict[str, Any]:
    _cleanup()
    analysis_id = f"analysis-{uuid.uuid4()}"
    enriched_metadata = {**metadata, "analysis_id": analysis_id}
    raw = extraction_orchestrator.process_pdf(pdf_bytes)
    result = _build_analysis(raw, enriched_metadata)
    result["analysis_id"] = analysis_id
    result["expires_in_seconds"] = RESULT_TTL_SECONDS
    _results[analysis_id] = (time.monotonic() + RESULT_TTL_SECONDS, result)
    return result


def analyze_excel(excel_bytes: bytes, metadata: dict[str, Any]) -> dict[str, Any]:
    _cleanup()
    analysis_id = f"analysis-{uuid.uuid4()}"
    raw = excel_extractor.process_excel(excel_bytes)

    transfers = raw.get("transfers", [])
    raw_withdrawals = raw.get("withdrawals", [])

    parsed_transfers = [data_normalizer.normalize_transaction(tx) for tx in transfers]

    victim_account = metadata.get("victim_account", "")
    victim_bank = metadata.get("victim_bank", "") or "Unknown bank"

    if not victim_account and parsed_transfers:
        victim_account = parsed_transfers[0].get("from_account_number", "")

    accounts_by_number: dict[str, dict[str, Any]] = {}

    def ensure_account(number: str, bank: str = "", holder: str = "", account_type: str = "SAVINGS") -> dict[str, Any]:
        clean_number = (number or "UNKNOWN").strip()
        if clean_number not in accounts_by_number:
            accounts_by_number[clean_number] = {
                "id": account_id_for(clean_number),
                "account_number": clean_number,
                "bank_name": bank or "Unknown bank",
                "ifsc": "",
                "holder_name": holder or "Unidentified account holder",
                "account_type": account_type,
                "layer": 0 if clean_number == victim_account else None,
                "layer_source": "DOCUMENT",
                "is_suspicious": clean_number != victim_account,
                "withdrawals": [],
                "withdrawal_count": 0,
                "total_withdrawal_amount": 0.0,
            }
        return accounts_by_number[clean_number]

    if victim_account:
        ensure_account(victim_account, victim_bank, metadata.get("victim_name", "Victim"))

    valid_transfers = []
    for index, tx in enumerate(parsed_transfers, start=1):
        source_number = tx.get("from_account_number") or victim_account
        target_number = tx.get("to_account_number") or f"UNRESOLVED-{index}"
        if not source_number and not target_number:
            continue
        source = ensure_account(source_number, tx.get("bank_name", ""))
        target = ensure_account(target_number, tx.get("bank_name", ""), tx.get("holder_name", ""), tx.get("account_type", "SAVINGS"))
        if tx.get("ifsc"):
            target["ifsc"] = tx["ifsc"]
        if tx.get("raw_layer_from_doc") is not None:
            target["raw_layer_from_doc"] = tx["raw_layer_from_doc"]
            target["layer"] = tx["raw_layer_from_doc"]
        tx.update({
            "id": f"transaction-{index}",
            "from_account_id": source["id"],
            "to_account_id": target["id"],
            "from_account_number": source_number,
            "to_account_number": target_number,
            "status": tx.get("review_status", "PENDING"),
        })
        valid_transfers.append(tx)

    accounts = list(accounts_by_number.values())
    valid_transfers = data_validator.validate_transactions(valid_transfers)
    accounts = layer_analyzer.analyze_layers(accounts, valid_transfers, victim_account)
    account_layers = {account["id"]: account.get("layer") for account in accounts}
    for tx in valid_transfers:
        doc_l = tx.get("raw_layer_from_doc")
        if doc_l is not None:
            tx["layer"] = doc_l
            tx["layer_source"] = "document"
        else:
            inferred_l = account_layers.get(tx.get("to_account_id"))
            tx["layer"] = inferred_l
            tx["layer_source"] = "inferred" if inferred_l is not None else "unknown"

    # Associate withdrawal events with matching accounts, and expose each
    # cash-out event as a connected account node so SHOW ALL can display it.
    associated_withdrawals = []
    cashout_txs = []
    for idx, w in enumerate(raw_withdrawals, start=1):
        acc_num = (w.get("account_number") or "").strip()
        matched_acc = accounts_by_number.get(acc_num)
        if matched_acc:
            w_obj = {
                "id": f"withdrawal-excel-{idx}",
                "account_id": matched_acc["id"],
                "account_number": matched_acc["account_number"],
                "withdrawal_type": w.get("withdrawal_type", "WITHDRAWAL"),
                "amount": float(w.get("amount", 0.0)),
                "raw_amount": str(w.get("raw_amount", w.get("amount", ""))),
                "date": w.get("date") or w.get("raw_date") or "",
                "bank_name": w.get("bank_name") or matched_acc.get("bank_name", ""),
                "utr_rrn": w.get("utr_rrn", ""),
                "location": w.get("location", ""),
                "remarks": w.get("remarks", ""),
                "sheet_name": w.get("sheet_name", ""),
                "layer": matched_acc.get("layer"),
            }
            matched_acc["withdrawals"].append(w_obj)
            matched_acc["withdrawal_count"] += 1
            matched_acc["total_withdrawal_amount"] += w_obj["amount"]
            associated_withdrawals.append(w_obj)

            kind = str(w.get("withdrawal_type") or "CASH_WITHDRAWAL").upper()
            acc_type = "ATM" if "ATM" in kind else ("POS" if "POS" in kind else "CASH")
            cashout_number = f"{acc_type}-{matched_acc['account_number']}-{idx}"
            cashout_acc = {
                "id": account_id_for(cashout_number),
                "account_number": cashout_number,
                "bank_name": w_obj["bank_name"] or matched_acc.get("bank_name", ""),
                "ifsc": "",
                "holder_name": w_obj["location"] or f"{acc_type} cash-out",
                "account_type": acc_type,
                "layer": matched_acc.get("layer"),
                "layer_source": "cashout",
                "is_suspicious": False,
                "withdrawals": [],
                "withdrawal_count": 0,
                "total_withdrawal_amount": 0.0,
            }
            accounts.append(cashout_acc)
            cashout_txs.append({
                "id": f"cashout-tx-{idx}",
                "from_account_number": matched_acc["account_number"],
                "to_account_number": cashout_number,
                "from_account_id": matched_acc["id"],
                "to_account_id": cashout_acc["id"],
                "amount": w_obj["amount"],
                "raw_amount": w_obj["raw_amount"],
                "disputed_amount": 0.0,
                "transaction_date": w_obj["date"],
                "raw_date": w_obj["date"],
                "utr_rrn": w_obj["utr_rrn"],
                "transaction_type": kind,
                "bank_name": w_obj["bank_name"],
                "layer": matched_acc.get("layer"),
                "status": "RESOLVED",
                "review_status": "RESOLVED",
            })

    graph = graph_builder.build_networkx_graph(accounts, valid_transfers + cashout_txs)

    total_fraud = metadata.get("total_fraud_amount")
    if not total_fraud and valid_transfers:
        disputed_total = sum(float(tx.get("disputed_amount") or 0.0) for tx in valid_transfers)
        if disputed_total > 0:
            total_fraud = disputed_total
        else:
            total_fraud = sum(float(tx.get("amount", 0.0)) for tx in valid_transfers if tx.get("layer") == 1 or tx.get("from_account_number") == victim_account)

    result = {
        "analysis_id": analysis_id,
        "expires_in_seconds": RESULT_TTL_SECONDS,
        "case": {
            "id": analysis_id,
            "case_number": metadata.get("case_number") or "TEMPORARY-ANALYSIS",
            "victim_name": metadata.get("victim_name", ""),
            "victim_account": victim_account,
            "victim_bank": victim_bank,
            "total_fraud_amount": total_fraud,
            "file_name": metadata["file_name"],
            "document_type": "EXCEL",
            "demo_data": False,
            "total_accounts": len(accounts),
            "total_transactions": len(valid_transfers),
        },
        "accounts": accounts,
        "transactions": valid_transfers,
        "withdrawals": associated_withdrawals,
        "graph": graph,
        "layers": sorted({a.get("layer") for a in accounts if a.get("layer") is not None}),
        "pages": raw["metadata"],
        "sections": raw["sections"],
        "demo_data": False,
    }
    _results[analysis_id] = (time.monotonic() + RESULT_TTL_SECONDS, result)
    return result


def get_analysis(analysis_id: str) -> dict[str, Any] | None:
    _cleanup()
    entry = _results.get(analysis_id)
    return entry[1] if entry else None


def delete_analysis(analysis_id: str) -> None:
    _results.pop(analysis_id, None)
