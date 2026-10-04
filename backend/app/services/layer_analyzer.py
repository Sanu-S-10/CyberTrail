"""
Layer Analyzer — Computes account layers from directed money-transfer relationships.

Document-specified destination layers are authoritative. Graph inference only fills
gaps and never reduces an explicit layer. Cash-out records are ignored.
"""

from __future__ import annotations

import logging
from collections import defaultdict, deque
from typing import Any

logger = logging.getLogger(__name__)

TRANSFER_TYPES = {"ACCOUNT_TRANSFER", "TRANSFER", ""}
CASHOUT_TYPES = {"ATM", "POS", "CASH", "ATM_WITHDRAWAL", "POS_WITHDRAWAL", "CASH_WITHDRAWAL", "AEPS_WITHDRAWAL", "WITHDRAWAL"}


class LayerAnalyzer:
    def analyze_layers(
        self,
        accounts: list[dict[str, Any]],
        transactions: list[dict[str, Any]],
        victim_account_number: str,
    ) -> list[dict[str, Any]]:
        acc_by_id = {acc["id"]: acc for acc in accounts}
        acc_by_number = {acc["account_number"]: acc for acc in accounts if acc.get("account_number")}

        victim_ids = {
            acc["id"]
            for acc in accounts
            if acc.get("account_number") == victim_account_number or acc.get("layer") == 0
        }
        for victim_id in victim_ids:
            victim = acc_by_id[victim_id]
            victim["layer"] = 0
            victim["layer_source"] = "document"
            victim["layer_confidence"] = 100.0
            victim["layer_reason"] = "Primary Victim Complaint Account"
            victim["layer_locked"] = True

        transfers = [
            tx for tx in transactions
            if (tx.get("transaction_type") or "ACCOUNT_TRANSFER") in TRANSFER_TYPES
            and tx.get("account_type") not in CASHOUT_TYPES
        ]

        explicit: dict[str, int] = {}
        for acc in accounts:
            if acc["id"] in victim_ids:
                continue
            doc_layer = acc.get("raw_layer_from_doc")
            if doc_layer is not None:
                explicit[acc["id"]] = int(doc_layer)

        for tx in transfers:
            dest_id = tx.get("to_account_id")
            doc_layer = tx.get("raw_layer_from_doc")
            if dest_id and dest_id not in victim_ids and doc_layer is not None:
                previous = explicit.get(dest_id)
                explicit[dest_id] = max(int(doc_layer), previous) if previous is not None else int(doc_layer)

        outgoing: dict[str, list[str]] = defaultdict(list)
        incoming: dict[str, list[str]] = defaultdict(list)
        for tx in transfers:
            src = tx.get("from_account_id")
            dst = tx.get("to_account_id")
            if src and dst and src != dst:
                outgoing[src].append(dst)
                incoming[dst].append(src)

        # NCRP-provided layers are authoritative. Inference below is used
        # only for accounts/transactions with no explicit Layer in the source;
        # inferred layers are clearly marked and never override document data.
        inferred: dict[str, int] = {vid: 0 for vid in victim_ids}
        for acc_id, layer in explicit.items():
            inferred[acc_id] = layer

        # Forward fill from explicit anchors for branches not reached from the victim
        # because of a page-split or missing victim edge.
        changed = True
        while changed:
            changed = False
            known = {**{k: v for k, v in inferred.items()}, **explicit}
            for tx in transfers:
                src = tx.get("from_account_id")
                dst = tx.get("to_account_id")
                if not src or not dst or src == dst:
                    continue
                src_layer = known.get(src)
                dst_explicit = explicit.get(dst)
                if src_layer is None:
                    continue
                candidate = src_layer + 1
                if dst_explicit is not None:
                    candidate = dst_explicit
                elif candidate == 1 and src not in victim_ids:
                    continue
                current_dst = inferred.get(dst)
                if current_dst is None or (dst_explicit is None and candidate > current_dst):
                    inferred[dst] = candidate if dst_explicit is None else dst_explicit
                    known[dst] = inferred[dst]
                    changed = True
                elif dst_explicit is not None and inferred.get(dst) != dst_explicit:
                    inferred[dst] = dst_explicit
                    known[dst] = dst_explicit
                    changed = True

        # Infer layers for nodes that never received a documented or inferred
        # layer. A source account sits one step before its destinations.
        known = {**inferred, **explicit}
        changed = True
        while changed:
            changed = False
            for acc_id, acc in acc_by_id.items():
                if acc_id in victim_ids or acc_id in known:
                    continue
                if acc.get("account_type") in ("ATM", "POS", "CASH"):
                    continue
                successors = outgoing.get(acc_id, [])
                dst_layers = [known[s] for s in successors if s in known]
                if dst_layers:
                    inferred[acc_id] = max(0, min(dst_layers) - 1)
                    known[acc_id] = inferred[acc_id]
                    changed = True

        for acc_id, acc in acc_by_id.items():
            if acc.get("account_type") in ("ATM", "POS", "CASH"):
                acc["layer"] = inferred.get(acc_id)
                acc["layer_source"] = "cashout"
                acc["layer_confidence"] = 0.0
                acc["layer_conflict"] = False
                acc["layer_reason"] = f"Cash-out event excluded from transfer-layer assignment ({acc.get('account_type')})"
                continue

            if acc_id in victim_ids:
                continue

            doc_layer = explicit.get(acc_id, acc.get("raw_layer_from_doc"))
            inf_layer = inferred.get(acc_id)

            if doc_layer is not None:
                acc["layer"] = int(doc_layer)
                acc["layer_source"] = "document"
                acc["layer_locked"] = True
                acc["layer_conflict"] = False
                acc["layer_confidence"] = 98.0
                acc["layer_reason"] = f"Explicitly stated in NCRP document as Layer {doc_layer}"
            elif inf_layer is not None:
                acc["layer"] = int(inf_layer)
                acc["layer_source"] = "inferred"
                acc["layer_conflict"] = False
                acc["layer_confidence"] = 90.0
                acc["layer_reason"] = f"Inferred from transaction trail (source document has no Layer value). Layer {inf_layer}"
                acc["layer_conflict"] = False
                acc["layer_confidence"] = 90.0
                acc["layer_reason"] = f"Inferred from transaction trail graph (Layer {inf_layer})"
            else:
                acc["layer"] = None
                acc["layer_source"] = "unknown"
                acc["layer_conflict"] = False
                acc["layer_confidence"] = 0.0
                acc["layer_reason"] = "No direct transfer path or document reference found"

        return list(acc_by_id.values())


layer_analyzer = LayerAnalyzer()
