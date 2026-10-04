"""Build a directed, account-based money-trail graph with aggregated edges."""

from __future__ import annotations

import logging
from collections import defaultdict
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
                layer_source=acc.get("layer_source"),
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
                    "utr_rrn": tx.get("utr_rrn"),
                    "transaction_type": tx.get("transaction_type"),
                    "source_page": tx.get("source_page", 1),
                },
            )
            bucket["amount"] += amount
            bucket["transaction_count"] += 1
            bucket["transactions"].append(
                {
                    "id": tx.get("id"),
                    "amount": amount,
                    "utr_rrn": tx.get("utr_rrn"),
                    "transaction_date": tx.get("transaction_date") or tx.get("raw_date"),
                    "source_page": tx.get("source_page"),
                }
            )
            if tx.get("utr_rrn"):
                bucket["utr_rrn"] = tx.get("utr_rrn")

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

        known_layers = [data.get("layer") for _, data in G.nodes(data=True) if data.get("layer") is not None]
        max_known_layer = max(known_layers, default=0)

        nodes_payload = []
        for n_id, data in G.nodes(data=True):
            effective_layer = data.get("layer")
            account_type = str(data.get("account_type") or "").upper()
            is_cash_out_type = account_type in CASHOUT_TYPES

            if effective_layer is None:
                if is_cash_out_type:
                    effective_layer = None
                elif G.out_degree(n_id) == 0:
                    effective_layer = max_known_layer + 1 if max_known_layer else None
                else:
                    effective_layer = None
                data = dict(data)
                data["layer"] = effective_layer
            else:
                data = dict(data)

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
                    "transaction_count": data.get("transaction_count", 1),
                    "total_amount": data.get("amount"),
                    "transactions": data.get("transactions", []),
                    "layerFrom": src_layer,
                    "layerTo": dst_layer,
                }
            )

        validation = self.validate_graph(nodes_payload, edges_payload, accounts)
        payload = {
            "nodes": nodes_payload,
            "edges": edges_payload,
            "node_count": len(nodes_payload),
            "edge_count": len(edges_payload),
            "validation": validation,
        }
        if validation["warnings"] and settings.is_development:
            for warning in validation["warnings"]:
                logger.warning("Money-trail graph validation: %s", warning)
        return payload

    def validate_graph(
        self,
        nodes_payload: list[dict[str, Any]],
        edges_payload: list[dict[str, Any]],
        accounts: list[dict[str, Any]],
    ) -> dict[str, Any]:
        warnings: list[str] = []
        node_ids = {node["id"] for node in nodes_payload}
        layers_by_id = {node["id"]: (node.get("data") or {}).get("layer") for node in nodes_payload}
        accounts_by_id = {acc["id"]: acc for acc in accounts}

        seen_identity: dict[str, str] = {}
        for node in nodes_payload:
            data = node.get("data") or {}
            if data.get("layer") is None and str(data.get("account_type") or "").upper() not in CASHOUT_TYPES:
                warnings.append(f"Node {data.get('account_number')} ({data.get('bank_name')}) has no layer.")
            identity = f"{data.get('account_number')}|{str(data.get('bank_name') or '').strip().lower()}"
            previous = seen_identity.get(identity)
            if previous:
                warnings.append(f"Duplicate account node for {identity}")
            seen_identity[identity] = node["id"]

            explicit = (accounts_by_id.get(node["id"]) or {}).get("raw_layer_from_doc")
            if explicit is not None and data.get("layer") != explicit:
                warnings.append(
                    f"Document layer {explicit} was not preserved for {data.get('bank_name')} {data.get('account_number')} (got {data.get('layer')})."
                )

        for edge in edges_payload:
            if edge["source"] not in node_ids or edge["target"] not in node_ids:
                warnings.append(f"Edge {edge.get('id')} references a missing node.")
                continue
            src_layer = layers_by_id.get(edge["source"])
            dst_layer = layers_by_id.get(edge["target"])
            if src_layer is not None and dst_layer is not None and dst_layer < src_layer:
                src = accounts_by_id.get(edge["source"], {})
                dst = accounts_by_id.get(edge["target"], {})
                warnings.append(
                    f"Edge goes backwards in layers: {src.get('bank_name')} L{src_layer} → {dst.get('bank_name')} L{dst_layer}"
                )

        victim_nodes = [node for node in nodes_payload if (node.get("data") or {}).get("layer") == 0]
        if not victim_nodes:
            warnings.append("No victim (layer 0) node is present.")

        return {"ok": len(warnings) == 0, "warnings": warnings}


graph_builder = GraphBuilder()
