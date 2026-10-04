"""Shared account/edge assembly used after PDF and Excel parsing."""

from __future__ import annotations

from typing import Any

from app.parsers.account_identity import (
    account_id_for,
    canonicalize_bank,
    display_bank,
    normalize_account,
)
from app.parsers.data_validator import data_validator
from app.services.graph_builder import graph_builder
from app.services.layer_analyzer import layer_analyzer

CASHOUT_TX_TYPES = {
    "ATM_WITHDRAWAL",
    "POS_WITHDRAWAL",
    "CASH_WITHDRAWAL",
    "AEPS_WITHDRAWAL",
    "WITHDRAWAL",
}


def assemble_trail(
    transfers: list[dict[str, Any]],
    withdrawals: list[dict[str, Any]],
    *,
    victim_account: str,
    victim_bank: str,
    victim_name: str = "Victim",
) -> dict[str, Any]:
    victim_account = normalize_account(victim_account)
    accounts: dict[str, dict[str, Any]] = {}
    accounts_by_number: dict[str, list[str]] = {}

    def ensure_account(number: str, bank: str, holder: str = "", account_type: str = "SAVINGS") -> dict[str, Any]:
        clean_number = normalize_account(number) or "UNKNOWN"
        bank_name = display_bank(bank) or "Unknown bank"
        node_id = account_id_for(clean_number, bank_name)
        existing = accounts.get(node_id)
        if existing:
            if (not existing.get("bank_name") or existing["bank_name"] == "Unknown bank") and bank_name != "Unknown bank":
                existing["bank_name"] = bank_name
            return existing
        account = {
            "id": node_id,
            "account_number": clean_number,
            "bank_name": bank_name,
            "ifsc": "",
            "holder_name": holder or "Unidentified account holder",
            "account_type": account_type,
            "layer": 0 if clean_number == victim_account and canonicalize_bank(bank_name) == canonicalize_bank(victim_bank or bank_name) else None,
            "layer_source": "DOCUMENT" if clean_number == victim_account else None,
            "is_suspicious": clean_number != victim_account,
            "withdrawals": [],
            "withdrawal_count": 0,
            "total_withdrawal_amount": 0.0,
        }
        if clean_number == victim_account and not canonicalize_bank(bank_name):
            account["layer"] = 0
        accounts[node_id] = account
        accounts_by_number.setdefault(clean_number, []).append(node_id)
        return account

    def resolve_source(number: str, dest_id: str | None, dest_layer: int | None, source_bank: str = "") -> dict[str, Any]:
        clean_number = normalize_account(number)
        candidates = [accounts[node_id] for node_id in accounts_by_number.get(clean_number, []) if node_id != dest_id]
        if source_bank:
            bank_matches = [acc for acc in candidates if canonicalize_bank(acc.get("bank_name")) == canonicalize_bank(source_bank)]
            if bank_matches:
                candidates = bank_matches
        if dest_layer is not None:
            previous = [acc for acc in candidates if acc.get("layer") == dest_layer - 1 or acc.get("raw_layer_from_doc") == dest_layer - 1]
            if previous:
                return sorted(previous, key=lambda acc: acc.get("layer") if acc.get("layer") is not None else 10**6)[0]
        if candidates:
            return sorted(
                candidates,
                key=lambda acc: (
                    acc.get("layer") is None,
                    acc.get("layer") if acc.get("layer") is not None else 10**6,
                ),
            )[0]
        fallback_bank = source_bank
        if clean_number == victim_account:
            fallback_bank = victim_bank or source_bank
        return ensure_account(clean_number, fallback_bank)

    if victim_account:
        ensure_account(victim_account, victim_bank, victim_name)

    parsed_transfers: list[dict[str, Any]] = []
    for index, tx in enumerate(transfers, start=1):
        if (tx.get("transaction_type") or "ACCOUNT_TRANSFER") in CASHOUT_TX_TYPES:
            continue
        source_number = normalize_account(tx.get("from_account_number") or "")
        target_number = normalize_account(tx.get("to_account_number") or "")
        if not source_number and victim_account:
            source_number = victim_account
        if not source_number and not target_number:
            continue
        dest_bank = tx.get("to_bank_name") or tx.get("bank_name") or ""
        dest_layer = tx.get("raw_layer_from_doc")
        target = ensure_account(
            target_number or f"UNRESOLVED-{index}",
            dest_bank,
            tx.get("holder_name", ""),
            tx.get("account_type", "SAVINGS"),
        )
        if tx.get("ifsc"):
            target["ifsc"] = tx["ifsc"]
        if dest_layer is not None:
            previous = target.get("raw_layer_from_doc")
            target["raw_layer_from_doc"] = max(int(dest_layer), int(previous)) if previous is not None else int(dest_layer)
        source = resolve_source(source_number, target["id"], dest_layer, tx.get("from_bank_name") or "")
        if source["id"] == target["id"] and canonicalize_bank(source.get("bank_name")) != canonicalize_bank(dest_bank):
            target = ensure_account(target_number, dest_bank, tx.get("holder_name", ""), tx.get("account_type", "SAVINGS"))
            source = resolve_source(source_number, target["id"], dest_layer, tx.get("from_bank_name") or "")
        tx.update({
            "id": tx.get("id") or f"transaction-{index}",
            "from_account_id": source["id"],
            "to_account_id": target["id"],
            "from_account_number": source["account_number"],
            "to_account_number": target["account_number"],
            "from_bank_name": source.get("bank_name"),
            "to_bank_name": target.get("bank_name"),
            "status": tx.get("review_status", "PENDING"),
        })
        parsed_transfers.append(tx)

    parsed_transfers = data_validator.validate_transactions(parsed_transfers)
    account_list = list(accounts.values())
    account_list = layer_analyzer.analyze_layers(account_list, parsed_transfers, victim_account)
    accounts = {acc["id"]: acc for acc in account_list}
    account_layers = {account["id"]: account.get("layer") for account in account_list}
    for tx in parsed_transfers:
        doc_l = tx.get("raw_layer_from_doc")
        tx["layer"] = doc_l if doc_l is not None else account_layers.get(tx.get("to_account_id"))

    associated_withdrawals = []
    for idx, withdrawal in enumerate(withdrawals, start=1):
        acc_num = normalize_account(withdrawal.get("from_account_number") or withdrawal.get("account_number") or "")
        matches = [accounts[node_id] for node_id in accounts_by_number.get(acc_num, []) if node_id in accounts]
        matched_acc = matches[0] if matches else None
        if not matched_acc:
            continue
        w_obj = {
            "id": withdrawal.get("id") or f"withdrawal-{idx}",
            "account_id": matched_acc["id"],
            "account_number": matched_acc["account_number"],
            "withdrawal_type": withdrawal.get("transaction_type") or withdrawal.get("withdrawal_type") or "WITHDRAWAL",
            "amount": float(withdrawal.get("amount", 0.0) or 0.0),
            "raw_amount": str(withdrawal.get("raw_amount", withdrawal.get("amount", ""))),
            "date": withdrawal.get("raw_date") or withdrawal.get("date") or "",
            "bank_name": withdrawal.get("bank_name") or matched_acc.get("bank_name", ""),
            "utr_rrn": withdrawal.get("utr_rrn", ""),
            "location": withdrawal.get("location") or withdrawal.get("to_account_number", ""),
            "remarks": withdrawal.get("remarks") or withdrawal.get("raw_source_text", ""),
            "sheet_name": withdrawal.get("sheet_name", ""),
            "layer": matched_acc.get("layer"),
        }
        matched_acc.setdefault("withdrawals", []).append(w_obj)
        matched_acc["withdrawal_count"] = matched_acc.get("withdrawal_count", 0) + 1
        matched_acc["total_withdrawal_amount"] = matched_acc.get("total_withdrawal_amount", 0.0) + w_obj["amount"]
        associated_withdrawals.append(w_obj)

    graph = graph_builder.build_networkx_graph(account_list, parsed_transfers)
    return {
        "accounts": account_list,
        "transactions": parsed_transfers,
        "withdrawals": associated_withdrawals,
        "graph": graph,
        "layers": sorted({a.get("layer") for a in account_list if a.get("layer") is not None}),
    }
