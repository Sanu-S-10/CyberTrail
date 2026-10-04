import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.parsers.table_extractor import table_extractor
from app.parsers.transaction_parser import transaction_parser

pdf_path = Path(__file__).resolve().parents[2] / "Reference" / "NCRP LATEST.pdf"
tables = table_extractor.extract_tables_from_bytes(pdf_path.read_bytes())

for table in tables:
    if table["page_num"] in (3, 4) and table["column_count"] == 11:
        print("\n==== PAGE", table["page_num"], "HEADER0", repr(table["headers"][0][:80]))
        all_rows = [table["headers"]] + table["rows"]
        for row in all_rows:
            if not row:
                continue
            c0 = str(row[0] or "")
            if not (c0.strip().isdigit() or c0.lower().startswith("s")):
                print("SKIP", repr(c0[:40]))
                continue
            print("--- SNO", c0.replace("\n", " "))
            for i in range(min(5, len(row))):
                print(f"  [{i}]", repr(row[i])[:220])

txs = transaction_parser.parse_raw_tables(tables)
print("\n\nPARSED TX COUNT", len(txs))
print(Counter(t["transaction_type"] for t in txs))
print("\nACCOUNT TRANSFERS:")
for tx in txs:
    if tx["transaction_type"] == "ACCOUNT_TRANSFER":
        print(
            f"L{tx.get('raw_layer_from_doc')} "
            f"{tx.get('from_account_number')!r} -> {tx.get('to_account_number')!r} | "
            f"{tx.get('bank_name')!r} | amt={tx.get('raw_amount')!r}"
        )
