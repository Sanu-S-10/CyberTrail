"""
Layer Analyzer — assigns NCRP layers from the source document.

Rules:
- A Layer value printed in the source document is authoritative and is never
  replaced by BFS, graph depth, account depth, or visual position.
- A transaction keeps the exact Layer value of its own source row.
- An account may legitimately appear in transactions of several documented
  layers, so every documented layer is preserved in ``document_layers``.
  ``layer`` is only the representative (lowest documented) layer used for
  positioning and is always accompanied by ``layer_source`` metadata.
- Inference happens only for accounts whose source rows carry no Layer value
  and is always reported as ``inferred`` / ``unresolved`` — never as a
  document layer.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

logger = logging.getLogger(__name__)

TRANSFER_TYPES = {"ACCOUNT_TRANSFER", "TRANSFER", ""}
CASHOUT_TYPES = {"ATM", "POS", "CASH", "ATM_WITHDRAWAL", "POS_WITHDRAWAL", "CASH_WITHDRAWAL", "AEPS_WITHDRAWAL", "CHEQUE_WITHDRAWAL", "WITHDRAWAL"}
CASHOUT_ACCOUNT_TYPES = ("ATM", "POS", "CASH")


class LayerAnalyzer:
    def analyze_layers(
        self,
        accounts: list[dict[str, Any]],
        transactions: list[dict[str, Any]],
        victim_account_number: str = "",
    ) -> list[dict[str, Any]]:
        acc_by_id = {acc["id"]: acc for acc in accounts}

        victim_ids = {
            acc["id"]
            for acc in accounts
            if acc.get("account_number") == victim_account_number or acc.get("layer") == 0
        }
        for victim_id in victim_ids:
            victim = acc_by_id[victim_id]
            victim["layer"] = 0
            victim["layer_source"] = "victim"
            victim["layer_confidence"] = 100.0
            victim["layer_reason"] = "Victim / origin account (root of the money trail)"
            victim["layer_locked"] = True
            victim.setdefault("document_layers", [0])

        transfers = [
            tx for tx in transactions
            if (tx.get("transaction_type") or "ACCOUNT_TRANSFER") in TRANSFER_TYPES
            and tx.get("account_type") not in CASHOUT_TYPES
        ]

        # 1. Collect every documented layer per account. An account can appear in
        #    several documented layers; all of them are preserved.
        document_layers: dict[str, set[int]] = defaultdict(set)
        for acc in accounts:
            if acc["id"] in victim_ids:
                continue
            doc_layer = acc.get("raw_layer_from_doc")
            if doc_layer is not None:
                document_layers[acc["id"]].add(int(doc_layer))

        for tx in transfers:
            dest_id = tx.get("to_account_id")
            doc_layer = tx.get("raw_layer_from_doc")
            if dest_id and doc_layer is not None and dest_id not in victim_ids:
                document_layers[dest_id].add(int(doc_layer))
                tx["layer"] = int(doc_layer)
                tx["layer_source"] = "document"

        outgoing: dict[str, list[str]] = defaultdict(list)
        incoming: dict[str, set[str]] = defaultdict(set)
        for tx in transfers:
            src = tx.get("from_account_id")
            dst = tx.get("to_account_id")
            if src and dst and src != dst:
                outgoing[src].append(dst)
                incoming[dst].add(src)

        # 2. Infer only for accounts with no documented layer at all, using the
        #    most shallow documented destination layer minus one hop.
        inferred: dict[str, int] = {}
        known_layers: dict[str, int] = {}
        for acc_id, layers in document_layers.items():
            known_layers[acc_id] = min(layers)

        changed = True
        while changed:
            changed = False
            for acc_id, acc in acc_by_id.items():
                if acc_id in victim_ids or acc_id in known_layers:
                    continue
                if str(acc.get("account_type") or "").upper() in CASHOUT_ACCOUNT_TYPES:
                    continue
                predecessors = incoming.get(acc_id, set())
                predecessor_layers = [known_layers[s] for s in predecessors if s in known_layers]
                if predecessor_layers:
                    inferred[acc_id] = max(0, min(predecessor_layers) + 1)
                    known_layers[acc_id] = inferred[acc_id]
                    changed = True
                    continue
                successors = outgoing.get(acc_id, [])
                successor_layers = [known_layers[s] for s in successors if s in known_layers]
                if successor_layers:
                    inferred[acc_id] = max(0, min(successor_layers) - 1)
                    known_layers[acc_id] = inferred[acc_id]
                    changed = True

        # 3. Assign layers without ever overriding documented values.
        for acc_id, acc in acc_by_id.items():
            account_type = str(acc.get("account_type") or "").upper()

            if acc_id in victim_ids:
                acc["document_layers"] = sorted(set(acc.get("document_layers") or [0]))
                continue

            documented = sorted(document_layers.get(acc_id) or set())
            acc["document_layers"] = documented

            if documented:
                representative = documented[0]
                acc["layer"] = representative
                acc["layer_source"] = "document"
                acc["layer_locked"] = True
                acc["layer_conflict"] = False
                acc["layer_confidence"] = 100.0
                acc["layer_reason"] = (
                    f"Stated in NCRP document as Layer {', '.join(str(value) for value in documented)}"
                    if len(documented) > 1
                    else f"Stated in NCRP document as Layer {representative}"
                )
                continue

            if account_type in CASHOUT_ACCOUNT_TYPES:
                acc["layer"] = None
                acc["layer_source"] = "cashout"
                acc["layer_conflict"] = False
                acc["layer_confidence"] = 0.0
                acc["layer_reason"] = (
                    f"Cash-out event ({account_type}); withdrawal events never create a layer"
                )
                continue

            if acc_id in inferred:
                acc["layer"] = inferred[acc_id]
                acc["layer_source"] = "inferred"
                acc["layer_conflict"] = False
                acc["layer_confidence"] = 90.0
                acc["layer_reason"] = (
                    f"Inferred from the money trail (source document has no Layer value). Layer {inferred[acc_id]}"
                )
                continue

            acc["layer"] = None
            acc["layer_source"] = "unresolved"
            acc["layer_conflict"] = False
            acc["layer_confidence"] = 0.0
            acc["layer_reason"] = "No Layer value in the source document and no transfer path found"

        return list(acc_by_id.values())


layer_analyzer = LayerAnalyzer()