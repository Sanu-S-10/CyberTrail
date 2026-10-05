"""Build a directed, account-based money-trail graph with aggregated edges.

Layer handling: the graph never invents or reorders NCRP layers. Node layers
come from the source document, edges keep the layers of the transactions they
aggregate, and validation only reports genuine source-data integrity issues.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import networkx as nx

from app.core.config import settings

logger = logging.getLogger(__name__)

CASHOUT_TYPES = {"ATM", "POS", "CASH"}


class GraphBuilder:
    def build_networkx_graph(
        self,
        accounts: list[dict[str, Any]],
        transactions: list[dict[str, Any]],
        layer_filter: Optional[int] = None,
    ) -> dict[str, Any]:
        G = nx.DiGraph()

        for acc in accounts:
            acc_layer = acc.get("layer")
            if layer_filter is not None and acc_layer != layer_filter:
                continue
            G.add_node(
                acc["id"],
                account_number=acc.get("account_number"),
                bank_name=acc.get("bank_name"),
                ifsc=acc.get("ifsc", ""),
                holder_name=acc.get("holder_name"),
                account_type=acc.get("account_type", "SAVINGS"),
                layer=acc_layer,
                document_layers=list(acc.get("document_layers") or []),
                layer_source=acc.get("layer_source"),
                layer_reason=acc.get("layer_reason", ""),
                layer_conflict=acc.get("layer_conflict", False),
                is_suspicious=acc.get("is_suspicious", False),
                total_incoming=0.0,
                total_outgoing=0.0,
                incoming_count=0,
                outgoing_count=0,
                transaction_count=0,
                source_transactions=[],
                destination_transactions=[],
            )

        aggregated: dict[tuple[str, str], dict[str, Any]] = {}
        for tx in transactions:
            src = tx.get("from_account_id")
            dst = tx.get("to_account_id")
            if not src or not dst or src not in G.nodes or dst not in G.nodes or src == dst:
                continue
            amount = float(tx.get("amount", 0.0) or 0.0)
            key = (src, dst)
            bucket = aggregated.setdefault(
                key,
                {
                    "id": f"edge-{src}-{dst}",
                    "source": src,
                    "target": dst,
                    "amount": 0.0,
                    "transaction_count": 0,
                    "transactions": [],
                    "layers": [],
                    "utr_rrn": tx.get("utr_rrn"),
                    "transaction_type": tx.get("transaction_type"),
                    "source_page": tx.get("source_page", 1),
                    "source_sheet": tx.get("source_sheet"),
                },
            )
            bucket["amount"] += amount
            bucket["transaction_count"] += 1
            tx_layer = tx.get("layer")
            if tx_layer is not None and int(tx_layer) not in bucket["layers"]:
                bucket["layers"].append(int(tx_layer))
            bucket["transactions"].append(
                {
                    "id": tx.get("id"),
                    "amount": amount,
                    "utr_rrn": tx.get("utr_rrn"),
                    "transaction_date": tx.get("transaction_date") or tx.get("raw_date"),
                    "layer": tx_layer,
                    "source_page": tx.get("source_page"),
                    "source_sheet": tx.get("source_sheet"),
                }
            )
            if tx.get("utr_rrn"):
                bucket["utr_rrn"] = tx["utr_rrn"]

            G.nodes[src]["total_outgoing"] += amount
            G.nodes[src]["outgoing_count"] += 1
            G.nodes[src]["transaction_count"] += 1
            G.nodes[src]["source_transactions"].append(tx.get("id"))
            G.nodes[dst]["total_incoming"] += amount
            G.nodes[dst]["incoming_count"] += 1
            G.nodes[dst]["transaction_count"] += 1
            G.nodes[dst]["destination_transactions"].append(tx.get("id"))

        for (src, dst), data in aggregated.items():
            G.add_edge(src, dst, **data)

        document_layers = sorted(
            {
                int(value)
                for _, data in G.nodes(data=True)
                for value in (data.get("document_layers") or [])
                if int(value) > 0
            }
        )

        nodes_payload = []
        for n_id, data in G.nodes(data=True):
            data = dict(data)
            account_type = str(data.get("account_type") or "").upper()
            is_cash_out_type = account_type in CASHOUT_TYPES
            # An unresolved layer stays unresolved: it is never promoted to a
            # numeric layer so the UI cannot present it as an NCRP layer.
            data["is_final"] = is_cash_out_type
            data["is_leaf"] = G.out_degree(n_id) == 0
            nodes_payload.append({"id": n_id, "type": data.get("account_type"), "data": data})

        edges_payload = []
        for u, v, data in G.edges(data=True):
            src_layer = G.nodes[u].get("layer")
            dst_layer = G.nodes[v].get("layer")
            edges_payload.append(
                {
                    "id": data.get("id"),
                    "source": u,
                    "target": v,
                    "amount": data.get("amount"),
                    "utr_rrn": data.get("utr_rrn"),
                    "transaction_type": data.get("transaction_type"),
                    "source_page": data.get("source_page"),
                    "source_sheet": data.get("source_sheet"),
                    "transaction_count": data.get("transaction_count", 1),
                    "total_amount": data.get("amount"),
                    "transactions": data.get("transactions", []),
                    "layers": data.get("layers", []),
                    "layerFrom": src_layer,
                    "layerTo": dst_layer,
                }
            )

        validation = self.validate_graph(nodes_payload, edges_payload, accounts, transactions)
        payload = {
            "nodes": nodes_payload,
            "edges": edges_payload,
            "node_count": len(nodes_payload),
            "edge_count": len(edges_payload),
            "document_layers": document_layers,
            "validation": validation,
        }
        if validation["issues"] and settings.is_development:
            for issue in validation["issues"]:
                logger.warning("Money-trail data check: %s", issue)
        return payload

    def validate_graph(
        self,
        nodes_payload: list[dict[str, Any]],
        edges_payload: list[dict[str, Any]],
        accounts: list[dict[str, Any]],
        transactions: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Report genuine source-data integrity issues.

        A documented layer relationship that is not sequentially increasing
        (for example Layer 7 -> Layer 6) is valid NCRP data and is never
        reported here.
        """
        transactions = transactions or []
        issues: list[str] = []
        notes: list[str] = []
        node_ids = {node["id"] for node in nodes_payload}

        seen_identity: dict[str, str] = {}
        unresolved_nodes = 0
        multi_layer_accounts = 0
        for node in nodes_payload:
            data = node.get("data") or {}
            account_type = str(data.get("account_type") or "").upper()
            documented = data.get("document_layers") or []
            if len(documented) > 1:
                multi_layer_accounts += 1
                notes.append(
                    f"Account {data.get('account_number')} appears in documented layers "
                    f"{', '.join(str(value) for value in documented)}"
                )
            if data.get("layer") is None and account_type not in CASHOUT_TYPES:
                unresolved_nodes += 1
            identity = f"{data.get('account_number')}|{str(data.get('bank_name') or '').strip().lower()}"
            if identity in seen_identity:
                issues.append(f"Duplicate account node for {data.get('account_number')} ({data.get('bank_name')})")
            seen_identity[identity] = node["id"]

        for edge in edges_payload:
            if edge["source"] not in node_ids or edge["target"] not in node_ids:
                issues.append(f"Edge {edge.get('id')} references a missing node.")
                continue
            if not edge.get("transaction_count"):
                issues.append(f"Edge {edge.get('id')} has no underlying transaction.")

        missing_layer_transactions = sum(
            1 for tx in transactions if tx.get("transaction_type") == "ACCOUNT_TRANSFER" and tx.get("layer") is None
        )
        malformed = sum(
            1
            for tx in transactions
            if tx.get("transaction_type") == "ACCOUNT_TRANSFER"
            and (
                not tx.get("from_account_id")
                or not tx.get("to_account_id")
                or not float(tx.get("amount") or 0)
            )
        )
        if missing_layer_transactions:
            notes.append(f"{missing_layer_transactions} transfer transactions carry no Layer value in the source")
        if malformed:
            issues.append(f"{malformed} transfer transactions have a missing account or non-positive amount.")

        return {
            "ok": len(issues) == 0,
            "issues": issues,
            "notes": notes,
            "data_quality": {
                "graph_nodes": len(nodes_payload),
                "graph_edges": len(edges_payload),
                "unresolved_layer_accounts": unresolved_nodes,
                "multi_layer_accounts": multi_layer_accounts,
                "transfer_transactions_without_layer": missing_layer_transactions,
                "malformed_transactions": malformed,
            },
        }


graph_builder = GraphBuilder()