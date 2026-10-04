# backend/tests/test_parsing.py
"""
Unit tests for data normalizer and validator modules.
"""

from app.parsers.data_normalizer import data_normalizer
from app.parsers.data_validator import data_validator

def test_amount_normalization():
    assert data_normalizer.normalize_amount("Rs. 2,50,000") == 250000.0
    assert data_normalizer.normalize_amount("₹1,50,000.00") == 150000.0
    assert data_normalizer.normalize_amount("2.5 Lakhs") == 250000.0

def test_ifsc_validation():
    code, valid = data_normalizer.normalize_ifsc("SYNB0001001")
    assert code == "SYNB0001001"
    assert valid is True

    bad_code, bad_valid = data_normalizer.normalize_ifsc("INVALID_IFSC")
    assert bad_valid is False

def test_validator_rules():
    txs = [
        {"to_account_number": "1234", "ifsc": "SYNB0001001", "is_ifsc_valid": True, "utr_rrn": "UTR100", "amount": 5000},
        {"to_account_number": "5678", "ifsc": "INVALID", "is_ifsc_valid": False, "utr_rrn": "", "amount": -10},
    ]

    res = data_validator.validate_transactions(txs)
    assert res[0]["review_status"] == "CONFIRMED"
    assert res[1]["review_status"] == "NEEDS_REVIEW"
    assert "INVALID_IFSC_CODE" in res[1]["validation_flags"]
