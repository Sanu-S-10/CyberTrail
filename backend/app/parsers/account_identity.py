"""Normalize NCRP account numbers, bank names, and layered node identity."""

from __future__ import annotations

import hashlib
import re
from typing import Any


IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$", re.IGNORECASE)
ACCOUNT_TOKEN_RE = re.compile(r"^[0-9Xx]{1,}$")
PRIVATE_USE_RE = re.compile(r"[\uE000-\uF8FF]")
LAYER_IN_TEXT_RE = re.compile(r"\blayer\s*[:\-]?\s*(\d+)\b", re.IGNORECASE)
UTR_HINT_RE = re.compile(r"(rrn|utr|imps|neft|rtgs|sibl|bdbl|fdrl|idib)", re.IGNORECASE)


def clean_text(value: Any) -> str:
    text = PRIVATE_USE_RE.sub("", str(value or ""))
    return re.sub(r"[ \t]+", " ", text).strip()


def normalize_account(account_number: Any) -> str:
    raw = clean_text(account_number).replace("\n", "").replace("\r", "")
    compact = re.sub(r"[\s\-_/]", "", raw)
    compact = re.sub(r"[^0-9A-Za-zXx]", "", compact)
    if re.fullmatch(r"[0-9Xx]+", compact or ""):
        return compact.upper()
    return compact


def canonicalize_bank(bank_name: Any) -> str:
    text = LAYER_IN_TEXT_RE.sub("", clean_text(bank_name))
    text = re.sub(r"\s+", " ", text.replace("\n", " ")).strip()
    text = re.sub(r"\(.*?\)", "", text).strip(" -,/")
    return re.sub(r"\s+", " ", text).lower()


def display_bank(bank_name: Any) -> str:
    text = LAYER_IN_TEXT_RE.sub("", clean_text(bank_name))
    return re.sub(r"\s+", " ", text.replace("\n", " ")).strip(" -,/")


def layer_from_text(value: Any) -> int | None:
    match = LAYER_IN_TEXT_RE.search(str(value or ""))
    return int(match.group(1)) if match else None


def parse_source_account_cell(value: Any) -> tuple[str, str]:
    """Source cells are typically 'account\\nUTR' — do not join the UTR into the account."""
    lines = [clean_text(line) for line in str(value or "").splitlines() if clean_text(line)]
    account = ""
    utr = ""
    for line in lines:
        compact = re.sub(r"[\s\-_/]", "", line)
        if not account and ACCOUNT_TOKEN_RE.fullmatch(compact) and len(re.sub(r"[Xx]", "", compact)) >= 4:
            account = normalize_account(compact)
            continue
        if not utr and compact and not IFSC_RE.match(compact):
            utr = compact
    if not account and lines:
        account = normalize_account(lines[0])
    return account, utr


def parse_destination_account_cell(value: Any) -> tuple[str, str]:
    """Join wrapped digit fragments and split IFSC out of the destination cell."""
    lines = [clean_text(line) for line in str(value or "").splitlines() if clean_text(line)]
    account_parts: list[str] = []
    ifsc = ""
    for line in lines:
        compact = re.sub(r"[\s\-_/]", "", line)
        if IFSC_RE.match(compact):
            ifsc = compact.upper()
            continue
        if ACCOUNT_TOKEN_RE.fullmatch(compact) and compact:
            if UTR_HINT_RE.search(compact) and account_parts:
                continue
            account_parts.append(compact)
    account = normalize_account("".join(account_parts))
    return account, ifsc


def node_identity(account_number: str, bank_name: str) -> str:
    return f"{normalize_account(account_number)}|{canonicalize_bank(bank_name)}"


def account_id_for(account_number: str, bank_name: str = "") -> str:
    digest = hashlib.sha1(node_identity(account_number, bank_name).encode("utf-8")).hexdigest()[:12]
    return f"account-{digest}"
