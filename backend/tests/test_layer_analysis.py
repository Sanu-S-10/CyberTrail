# backend/tests/test_layer_analysis.py
"""
Layer Analyzer tests for the document-authoritative layer model.

Document Layer values are authoritative: they are never replaced by BFS,
graph depth or account depth. An account may legitimately appear in several
documented layers, so all of them are preserved.
"""

from app.services.layer_analyzer import layer_analyzer


def test_chain_layer_analysis():
    """Accounts without a documented layer may still be inferred."""
    accounts = [
        {"id": "a0", "account_number": "V1", "raw_layer_from_doc": 0},
        {"id": "a1", "account_number": "M1", "raw_layer_from_doc": 1},
        {"id": "a2", "account_number": "M2", "raw_layer_from_doc": None},
    ]
    transactions = [
        {"from_account_id": "a0", "to_account_id": "a1"},
        {"from_account_id": "a1", "to_account_id": "a2"},
    ]

    res = layer_analyzer.analyze_layers(accounts, transactions, "V1")
    acc_map = {a["id"]: a for a in res}

    assert acc_map["a0"]["layer"] == 0
    assert acc_map["a0"]["layer_source"] == "victim"
    assert acc_map["a1"]["layer"] == 1
    assert acc_map["a1"]["layer_source"] == "document"
    assert acc_map["a2"]["layer"] == 2
    assert acc_map["a2"]["layer_source"] == "inferred"


def test_documented_layer_is_never_replaced_by_graph_depth():
    """A documented layer that contradicts graph depth stays authoritative."""
    accounts = [
        {"id": "a0", "account_number": "V1", "raw_layer_from_doc": 0},
        {"id": "a1", "account_number": "M1", "raw_layer_from_doc": 1},
        {"id": "a2", "account_number": "M2", "raw_layer_from_doc": 3},
    ]
    transactions = [
        {"from_account_id": "a0", "to_account_id": "a1"},
        {"from_account_id": "a1", "to_account_id": "a2"},
    ]

    res = layer_analyzer.analyze_layers(accounts, transactions, "V1")
    acc_map = {a["id"]: a for a in res}

    assert acc_map["a2"]["layer"] == 3
    assert acc_map["a2"]["layer_source"] == "document"
    assert acc_map["a2"]["layer_locked"] is True
    assert acc_map["a2"]["document_layers"] == [3]


def test_account_can_appear_in_multiple_documented_layers():
    """The same account may be documented in several layers; all are kept."""
    accounts = [
        {"id": "a0", "account_number": "V1", "raw_layer_from_doc": 0},
        {"id": "a1", "account_number": "M1", "raw_layer_from_doc": None},
    ]
    transactions = [
        {"from_account_id": "a0", "to_account_id": "a1", "raw_layer_from_doc": 2},
        {"from_account_id": "a0", "to_account_id": "a1", "raw_layer_from_doc": 5},
        {"from_account_id": "a0", "to_account_id": "a1", "raw_layer_from_doc": 2},
    ]

    res = layer_analyzer.analyze_layers(accounts, transactions, "V1")
    acc_map = {a["id"]: a for a in res}

    assert acc_map["a1"]["document_layers"] == [2, 5]
    assert acc_map["a1"]["layer"] == 2
    # Every transaction keeps its own documented layer.
    assert [tx["layer"] for tx in transactions] == [2, 5, 2]
    assert all(tx["layer_source"] == "document" for tx in transactions)


def test_non_sequential_documented_layers_are_not_flagged():
    """Layer 7 -> Layer 6 is valid source data and must not be a conflict."""
    accounts = [
        {"id": "a0", "account_number": "A", "raw_layer_from_doc": 7},
        {"id": "a1", "account_number": "B", "raw_layer_from_doc": 6},
    ]
    transactions = [{"from_account_id": "a0", "to_account_id": "a1", "raw_layer_from_doc": 6}]

    res = layer_analyzer.analyze_layers(accounts, transactions, "")

    assert all(acc["layer_conflict"] is False for acc in res)
    assert {acc["id"]: acc["layer"] for acc in res} == {"a0": 7, "a1": 6}


def test_unresolved_account_stays_unresolved():
    """No documented layer and no transfer path -> unresolved, never a number."""
    accounts = [{"id": "a9", "account_number": "Z9", "raw_layer_from_doc": None}]

    res = layer_analyzer.analyze_layers(accounts, [], "")

    assert res[0]["layer"] is None
    assert res[0]["layer_source"] == "unresolved"
    assert res[0]["document_layers"] == []


def test_cashout_account_never_gets_a_layer():
    accounts = [{"id": "c0", "account_number": "ATM-1", "account_type": "ATM", "raw_layer_from_doc": None}]

    res = layer_analyzer.analyze_layers(accounts, [], "")

    assert res[0]["layer"] is None
    assert res[0]["layer_source"] == "cashout"