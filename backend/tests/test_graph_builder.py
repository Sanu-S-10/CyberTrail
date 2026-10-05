# backend/tests/test_graph_builder.py
"""Graph builder tests: node/edge payload integrity and source-data validation."""

from app.services.graph_builder import graph_builder


def _account(acc_id, number, layer, account_type="SAVINGS", document_layers=None):
    return {
        "id": acc_id,
        "account_number": number,
        "bank_name": "HDFC Bank",
        "account_type": account_type,
        "layer": layer,
        "document_layers": document_layers if document_layers is not None else ([layer] if layer else []),
        "layer_source": "document",
        "layer_reason": "",
    }


def _tx(tx_id, src, dst, amount, layer):
    return {
        "id": tx_id,
        "from_account_id": src,
        "to_account_id": dst,
        "amount": amount,
        "layer": layer,
        "transaction_type": "ACCOUNT_TRANSFER",
        "utr_rrn": f"UTR{tx_id}",
    }


def test_aggregated_edge_keeps_every_transaction_and_count():
    accounts = [_account("a0", "V1", 0), _account("a1", "M1", 1)]
    transactions = [_tx("t1", "a0", "a1", 100.0, 1), _tx("t2", "a0", "a1", 50.0, 1)]

    graph = graph_builder.build_networkx_graph(accounts, transactions)

    assert len(graph["edges"]) == 1
    edge = graph["edges"][0]
    assert edge["transaction_count"] == 2
    assert len(edge["transactions"]) == 2
    assert edge["amount"] == 150.0
    assert edge["layers"] == [1]


def test_document_layers_are_exposed_and_exclude_internal_zero():
    accounts = [
        _account("a0", "V1", 0, document_layers=[0]),
        _account("a1", "M1", 3, document_layers=[3, 5]),
    ]
    graph = graph_builder.build_networkx_graph(accounts, [_tx("t1", "a0", "a1", 10.0, 3)])

    assert graph["document_layers"] == [3, 5]
    node = next(n for n in graph["nodes"] if n["id"] == "a1")
    assert node["data"]["document_layers"] == [3, 5]
    assert node["data"]["layer"] == 3


def test_unresolved_layer_is_never_promoted_to_a_number():
    account = _account("a1", "M1", None, document_layers=[])
    account["layer_source"] = "unresolved"
    graph = graph_builder.build_networkx_graph([account], [])

    node = graph["nodes"][0]
    assert node["data"]["layer"] is None
    assert node["data"]["layer_source"] != "document"


def test_validator_ignores_non_sequential_document_layers():
    accounts = [_account("a0", "A", 7), _account("a1", "B", 6)]
    transactions = [_tx("t1", "a0", "a1", 10.0, 6)]
    graph = graph_builder.build_networkx_graph(accounts, transactions)

    validation = graph["validation"]
    assert validation["ok"] is True
    assert validation["issues"] == []


def test_validator_reports_malformed_transactions():
    accounts = [_account("a0", "A", 1), _account("a1", "B", 2)]
    transactions = [_tx("t1", "a0", "a1", 0.0, 2)]
    graph = graph_builder.build_networkx_graph(accounts, transactions)

    assert graph["validation"]["ok"] is False
    assert any("malformed" in issue.lower() or "non-positive" in issue.lower() for issue in graph["validation"]["issues"])


def test_cashout_nodes_are_flagged_and_do_not_create_layers():
    accounts = [
        _account("a0", "V1", 0, document_layers=[0]),
        _account("w0", "ATM-V1-1", 4, account_type="ATM", document_layers=[]),
    ]
    transactions = [
        _tx("t1", "a0", "w0", 500.0, None),
    ]
    graph = graph_builder.build_networkx_graph(accounts, transactions)

    cashout = next(n for n in graph["nodes"] if n["id"] == "w0")
    assert cashout["data"]["is_final"] is True
    assert graph["document_layers"] == []