# backend/tests/test_excel_pipeline.py
"""
Excel pipeline regression tests.

These build NCRP-shaped workbooks in memory (no reference file needed) so the
pipeline can be validated against arbitrary uploaded workbooks:
Money Transfer To parsing, repeated headers, blank rows, ignored sheets,
withdrawal classification/matching, layer preservation, no artificial layers,
and reported vs disputed amount separation.
"""

import io

import openpyxl
import pytest

from app.parsers.excel_extractor import excel_extractor
from app.services.temporary_analysis import analyze_excel

TRANSFER_HEADERS = [
    "S No.",
    "Acknowledgement No.",
    "Account No./ (Wallet /PG/PA) Id",
    "Transaction Id / UTR Number",
    "Bank/FIs",
    "Layer",
    "Account No",
    "Ifsc Code",
    "Transaction Date",
    "Transaction Amount",
    "Disputed Amount",
    "Remarks",
]

ATM_HEADERS = [
    "S No.",
    "Acknowledgement No.",
    "Account No./ (Wallet /PG/PA) Id",
    "Transaction Id / UTR Number",
    "Withdrawal Date & Ti",
    "Withdrawal Amount",
    "Disputed Amount",
    "ATM ID",
    "Place/Location of ATM",
    "Action Taken By bank",
]

POS_HEADERS = [
    "S No.",
    "Acknowledgement No.",
    "Account No./ (Wallet /PG/PA) Id",
    "Transaction Id / UTR Number",
    "Withdrawal Date & Ti",
    "Withdrawal Amount",
    "Disputed Amount",
    "Approval Code",
    "Merchant Name",
    "Action Taken By bank",
]

HOLD_HEADERS = [
    "S No.",
    "Acknowledgement No.",
    "Account No./ (Wallet /PG/PA) Id",
    "Transaction Id / UTR Number",
    "Put on hold Date",
    "Put on hold Amount",
    "Action Taken By bank",
]

AEPS_HEADERS = [
    "S No.",
    "Acknowledgement No.",
    "Account No./ (Wallet /PG/PA) Id",
    "Transaction Id / UTR Number",
    "Withdrawal Date",
    "Withdrawal Amount",
    "Action Taken By bank",
]

CHEQUE_HEADERS = [
    "S No.",
    "Acknowledgement No.",
    "Account No./ (Wallet /PG/PA) Id",
    "Transaction Id / UTR Number",
    "Account No",
    "Withdrawal Date & Ti",
    "Withdrawal Amount",
    "Disputed Amount",
    "Action Taken By bank",
]


def _workbook(sheets) -> bytes:
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    for name, rows in sheets:
        ws = wb.create_sheet(name)
        for row in rows:
            ws.append(row)
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def _base_workbook(**overrides):
    transfer_rows = [TRANSFER_HEADERS] + overrides.get(
        "transfer_rows",
        [
            [1, "ACK1", "9000000001", "UTR1", "HDFC Bank", "1", "9000000002", "HDFC0000002", "01/08/2026 10:00", "25,000.00", "25,000.00", "Success"],
            [2, "ACK1", "9000000001", "UTR2", "ICICI Bank", "1", "9000000003", "ICIC0000003", "01/08/2026 11:00", "40,000.00", "40,000.00", "Success"],
            [3, "ACK1", "9000000002", "UTR3", "Axis Bank", "2", "9000000004", "UTIB0000004", "02/08/2026 09:00", "30,000.00", "10,000.00", "Success"],
        ],
    )
    sheets = [("Money Transfer to", transfer_rows)]
    if overrides.get("withdrawals", True):
        sheets.append((
            "Withdrawal through ATM",
            [ATM_HEADERS, [1, "ACK1", "9000000004", "ATMW1", "02/08/2026 10:00", "4,000.00", "4,000.00", "ATM-1", "Mumbai", "Axis Bank"]],
        ))
        sheets.append((
            "Withdrawal through POS",
            [POS_HEADERS, [1, "ACK1", "9000000002", "POSW1", "02/08/2026 12:00", "1,500.00", "1,500.00", "067553", "Petroleum Fuels", "ICICI Bank"]],
        ))
        sheets.append((
            "AEPS",
            [AEPS_HEADERS, [1, "ACK1", "9000000004", "AEPS1", "02/08/2026 13:00", "500.00", "Yes Bank"]],
        ))
        sheets.append((
            "Cash Withdrawal through Cheque",
            [CHEQUE_HEADERS, [1, "ACK1", "9000000003", "CHQ1", "9000000003", "02/08/2026 14:00", "2,000.00", "2,000.00", "ICICI Bank"]],
        ))
    if overrides.get("non_transfer_sheets", True):
        sheets.append(("Transaction put on hold", [HOLD_HEADERS, [1, "ACK1", "9000000002", "HOLD1", "02/08/2026 15:00", "900.00", "HDFC Bank"]]))
        sheets.append((
            "Others Less Then 500",
            [["S No.", "Acknowledgement No.", "Account No./ (Wallet /PG/PA) Id", "Transaction Id / UTR Number", "Remarks", "Action Taken By bank"],
             [1, "ACK1", "9000000004", "LOW1", "Low value transaction", "Axis Bank"]],
        ))
    if overrides.get("cover"):
        sheets.append(("Cover", [["Total Fraudulent Amount reported by complainant: ₹1,25,000.00"]]))
    return _workbook(sheets)


def _analyze(**overrides):
    meta = {
        "file_name": "case.xlsx",
        "case_number": "T",
        "acknowledgement_no": "",
        "victim_name": "",
        "victim_account": "",
        "victim_bank": "",
        "total_fraud_amount": 0.0,
    }
    return analyze_excel(_base_workbook(**overrides), meta)


def test_openpyxl_is_installed_for_xlsx_support():
    """A clean install must be able to read .xlsx workbooks."""
    assert openpyxl.__version__


def test_only_money_transfer_to_creates_money_trail_edges():
    result = _analyze()
    assert result["case"]["total_transactions"] == 3
    assert all(tx.get("source_sheet") == "Money Transfer to" for tx in result["transactions"])
    # Non-transfer sheets are preserved as evidence, not discarded.
    assert len(result["other_records"]) >= 2
    assert {record["sheet_name"] for record in result["other_records"]} == {
        "Transaction put on hold",
        "Others Less Then 500",
    }


def test_repeated_headers_and_blank_rows_are_skipped():
    rows = [
        TRANSFER_HEADERS,
        [1, "ACK1", "9000000001", "UTR1", "HDFC Bank", "1", "9000000002", "HDFC0000002", "01/08/2026 10:00", "25,000.00", "25,000.00", "Success"],
        [],
        TRANSFER_HEADERS,
        [2, "ACK1", "9000000001", "UTR2", "ICICI Bank", "1", "9000000003", "ICIC0000003", "01/08/2026 11:00", "40,000.00", "40,000.00", "Success"],
        ["", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", ""],
    ]
    raw = excel_extractor.process_excel(_base_workbook(transfer_rows=rows))
    assert len(raw["transfers"]) == 2
    assert raw["transfers"][0]["to_account_number"] == "9000000002"
    assert raw["transfers"][1]["to_account_number"] == "9000000003"


def test_withdrawal_classification_and_account_matching():
    result = _analyze()
    types = {w["withdrawal_type"] for w in result["withdrawals"]}
    assert types == {"ATM_WITHDRAWAL", "POS_WITHDRAWAL", "AEPS_WITHDRAWAL", "CHEQUE_WITHDRAWAL"}
    assert result["case"]["withdrawal_event_count"] == 4
    # Withdrawals are events on transfer accounts, not extra transfer edges.
    assert all(w["withdrawal_type"] != "ACCOUNT_TRANSFER" for w in result["withdrawals"])


def test_unmatched_withdrawal_is_not_attached_to_the_trail():
    rows = [
        TRANSFER_HEADERS,
        [1, "ACK1", "9000000001", "UTR1", "HDFC Bank", "1", "9000000002", "HDFC0000002", "01/08/2026 10:00", "25,000.00", "25,000.00", "Success"],
    ]
    result = _analyze(transfer_rows=rows, withdrawals=True, non_transfer_sheets=False)
    atm_nodes = [a for a in result["accounts"] if a["account_type"] == "ATM"]
    # ATM row references an account that is not part of any transfer -> unmatched.
    assert all(node["account_number"].startswith("ATM-") for node in atm_nodes)
    assert result["case"]["withdrawal_event_count"] == len(result["withdrawals"])


def test_documented_layers_are_preserved_and_no_layer_is_manufactured():
    rows = [
        TRANSFER_HEADERS,
        [1, "ACK1", "9000000001", "UTR1", "HDFC Bank", "1", "9000000002", "HDFC0000002", "01/08/2026 10:00", "25,000.00", "25,000.00", "Success"],
        [2, "ACK1", "9000000002", "UTR2", "Axis Bank", "2", "9000000003", "UTIB0000003", "02/08/2026 09:00", "30,000.00", "30,000.00", "Success"],
        [3, "ACK1", "9000000003", "UTR3", "SBI", "3", "9000000004", "SBIN0000004", "03/08/2026 09:00", "5,000.00", "5,000.00", "Success"],
    ]
    result = _analyze(transfer_rows=rows)
    assert sorted(tx["layer"] for tx in result["transactions"]) == [1, 2, 3]
    assert result["layers"] == [1, 2, 3]
    assert max(result["layers"]) == 3
    node_layers = {a["id"]: a["layer"] for a in result["accounts"]}
    assert all(value is None or value <= 3 for value in node_layers.values())
    assert not any(isinstance(value, int) and value > 3 for value in node_layers.values())


def test_account_in_two_documented_layers_keeps_both():
    rows = [
        TRANSFER_HEADERS,
        [1, "ACK1", "9000000001", "UTR1", "HDFC Bank", "2", "9000000002", "HDFC0000002", "01/08/2026 10:00", "25,000.00", "25,000.00", "Success"],
        [2, "ACK1", "9000000001", "UTR2", "HDFC Bank", "5", "9000000002", "HDFC0000002", "02/08/2026 10:00", "10,000.00", "10,000.00", "Success"],
    ]
    result = _analyze(transfer_rows=rows)
    multi = [a for a in result["accounts"] if len(a.get("document_layers") or []) > 1]
    assert multi, "expected an account with several documented layers"
    assert sorted(multi[0]["document_layers"]) == [2, 5]
    assert sorted(tx["layer"] for tx in result["transactions"]) == [2, 5]


def test_reported_and_disputed_amounts_stay_separate():
    without_report = _analyze()
    assert without_report["case"]["reported_fraud_amount"] is None
    assert without_report["case"]["total_disputed_amount"] == pytest.approx(75000.0)
    assert without_report["case"]["total_fraud_amount"] is None

    with_report = _analyze(cover=True)
    assert with_report["case"]["reported_fraud_amount"] == pytest.approx(125000.0)
    assert with_report["case"]["total_disputed_amount"] == pytest.approx(75000.0)
    assert with_report["case"]["total_fraud_amount"] == pytest.approx(125000.0)


def test_counts_are_separated():
    result = _analyze()
    transfer_accounts = [a for a in result["accounts"] if a["account_type"] not in ("ATM", "POS", "CASH")]
    assert result["case"]["total_transfer_accounts"] == len(transfer_accounts)
    assert result["case"]["withdrawal_event_count"] == len(result["withdrawals"])
    assert result["case"]["total_transactions"] == len(result["transactions"])
    assert result["case"]["total_transfer_accounts"] + result["case"]["withdrawal_event_count"] <= len(result["accounts"])


def test_aggregated_edges_keep_transaction_counts():
    rows = [
        TRANSFER_HEADERS,
        [1, "ACK1", "9000000001", "UTR1", "HDFC Bank", "1", "9000000002", "HDFC0000002", "01/08/2026 10:00", "25,000.00", "25,000.00", "Success"],
        [2, "ACK1", "9000000001", "UTR2", "HDFC Bank", "1", "9000000002", "HDFC0000002", "01/08/2026 11:00", "15,000.00", "15,000.00", "Success"],
    ]
    result = _analyze(transfer_rows=rows, withdrawals=False, non_transfer_sheets=False)
    transfer_edges = [e for e in result["graph"]["edges"] if e["transaction_type"] == "ACCOUNT_TRANSFER"]
    assert len(transfer_edges) == 1
    edge = transfer_edges[0]
    assert edge["transaction_count"] == 2
    assert len(edge["transactions"]) == 2
    assert edge["amount"] == pytest.approx(40000.0)
    assert sorted(t["utr_rrn"] for t in edge["transactions"]) == ["UTR1", "UTR2"]


def test_graph_validation_reports_no_backwards_layer_errors():
    rows = [
        TRANSFER_HEADERS,
        [1, "ACK1", "9000000001", "UTR1", "HDFC Bank", "7", "9000000002", "HDFC0000002", "01/08/2026 10:00", "25,000.00", "25,000.00", "Success"],
        [2, "ACK1", "9000000001", "UTR2", "ICICI Bank", "6", "9000000003", "ICIC0000003", "01/08/2026 12:00", "10,000.00", "10,000.00", "Success"],
    ]
    result = _analyze(transfer_rows=rows, withdrawals=False, non_transfer_sheets=False)
    validation = result["graph"]["validation"]
    assert validation["ok"] is True
    assert validation["issues"] == []
    assert not any("backwards" in note for note in validation["notes"])
    assert validation["data_quality"]["malformed_transactions"] == 0