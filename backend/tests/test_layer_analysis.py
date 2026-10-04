# backend/tests/test_layer_analysis.py
"""
Unit tests for Layer Analyzer — tests chain, branching, dedup, and conflict rules.
"""

from app.services.layer_analyzer import layer_analyzer

def test_chain_layer_analysis():
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
    assert acc_map["a1"]["layer"] == 1
    assert acc_map["a2"]["layer"] == 2
    assert acc_map["a2"]["layer_source"] == "inferred"

def test_layer_conflict_detection():
    accounts = [
        {"id": "a0", "account_number": "V1", "raw_layer_from_doc": 0},
        {"id": "a1", "account_number": "M1", "raw_layer_from_doc": 1},
        {"id": "a2", "account_number": "M2", "raw_layer_from_doc": 3},  # Document says L3, graph says L2
    ]
    transactions = [
        {"from_account_id": "a0", "to_account_id": "a1"},
        {"from_account_id": "a1", "to_account_id": "a2"},
    ]

    res = layer_analyzer.analyze_layers(accounts, transactions, "V1")
    acc_map = {a["id"]: a for a in res}

    assert acc_map["a2"]["layer"] == 3
    assert acc_map["a2"]["layer_conflict"] is True
    assert "CONFLICT" in acc_map["a2"]["layer_reason"]
