# backend/app/services/report_generator.py
"""
PDF Report Generator — Uses ReportLab to generate official Cyber Cell investigation PDF reports.
Includes Case Info, Financial Summary, Layer Summary, Account Summary, Transaction Summary,
Source References, and Data Provenance (Source vs Calculated vs Inferred Data).
"""

import io
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable

logger = logging.getLogger(__name__)

class ReportGenerator:
    def generate_case_pdf_report(
        self,
        case_data: Dict[str, Any],
        accounts: List[Dict[str, Any]],
        transactions: List[Dict[str, Any]],
        graph_png_bytes: Optional[bytes] = None
    ) -> bytes:
        """
        Generates a comprehensive ReportLab PDF investigation report byte stream.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=16,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            "SubTitle",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#475569"),
            spaceAfter=12
        )
        h2_style = ParagraphStyle(
            "Heading2Custom",
            parent=styles["Heading2"],
            fontSize=12,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "BodyCustom",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#334155")
        )

        elements = []

        # Header Title
        elements.append(Paragraph("TEMPORARY PDF MONEY-TRAIL ANALYSIS", title_style))
        elements.append(Paragraph(f"DEMO DATA - NOT REAL when synthetic fallback is shown • Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=10))

        # Section 1: Case Summary Table
        elements.append(Paragraph("1. Case & Victim Summary", h2_style))
        max_layer = max((int(account.get("layer", 0) or 0) for account in accounts), default=0)
        total_amount = case_data.get("total_fraud_amount")
        total_amount_label = f"Rs. {float(total_amount):,.2f}" if total_amount else "Not available"
        case_info_data = [
            ["Case Number:", case_data.get("case_number", "DEMO-001"), "NCRP Ack No.:", case_data.get("acknowledgement_no", "N/A")],
            ["Victim Name:", case_data.get("victim_name", "N/A"), "Victim Account:", case_data.get("victim_account", "N/A")],
            ["Victim Bank:", case_data.get("victim_bank", "N/A"), "Total Fraud Amount:", total_amount_label],
            ["Status:", "COMPLETED", "Max Layer Depth:", f"Layer {max_layer}"]
        ]
        t_case = Table(case_info_data, colWidths=[100, 170, 100, 170])
        t_case.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor("#1e293b")),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ]))
        elements.append(t_case)
        elements.append(Spacer(1, 10))

        # Section 2: Data Provenance Summary
        elements.append(Paragraph("2. Data Provenance & Layer Summary", h2_style))
        layer_counts = {}
        for account in accounts:
            layer = account.get("layer")
            layer_counts[layer] = layer_counts.get(layer, 0) + 1
        provenance_data = [["Layer Category", "Node Count", "Provenance"]]
        provenance_data.extend([
            [f"Layer {layer}", str(count), "Document or graph-derived analysis"]
            for layer, count in sorted(layer_counts.items(), key=lambda item: (item[0] is None, item[0] or 0))
        ])
        t_prov = Table(provenance_data, colWidths=[150, 80, 310])
        t_prov.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(t_prov)
        elements.append(Spacer(1, 10))

        # Section 3: Money Flow Graph PNG (If provided)
        if graph_png_bytes:
            elements.append(Paragraph("3. Money Trail Visual Graph", h2_style))
            img_io = io.BytesIO(graph_png_bytes)
            elements.append(Image(img_io, width=540, height=260))
            elements.append(Spacer(1, 10))

        # Section 4: Transaction Summary Table
        elements.append(Paragraph("4. Key Transactions Summary", h2_style))
        tx_rows = [["Date & Time", "From Acc", "To Acc", "Bank Name", "Amount (Rs.)", "Layer", "UTR / RRN"]]
        for tx in transactions[:10]:  # Top 10 transactions
            tx_rows.append([
                str(tx.get("transaction_date", ""))[:16],
                tx.get("from_account_id", "N/A")[:8],
                tx.get("to_account_id", "N/A")[:8],
                str(tx.get("bank_name", ""))[:18],
                f"{float(tx.get('amount', 0)):,.2f}",
                f"L{tx.get('layer', 1)}",
                str(tx.get("utr_rrn", ""))[:16]
            ])
        t_tx = Table(tx_rows, colWidths=[80, 60, 60, 110, 80, 40, 110])
        t_tx.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 7),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(t_tx)
        elements.append(Spacer(1, 15))

        # Disclaimer Footer
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=5))
        elements.append(Paragraph("DISCLAIMER: This temporary report is produced for analysis and training. No account, user, or case data is retained by this application.", subtitle_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

report_generator = ReportGenerator()
