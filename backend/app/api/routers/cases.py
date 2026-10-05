"""Temporary, session-oriented PDF analysis endpoints."""

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.services.temporary_analysis import analyze_pdf, analyze_excel, delete_analysis, get_analysis
from app.services.report_generator import report_generator

router = APIRouter(prefix="/cases", tags=["analysis"])
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024


@router.post("/analyze")
async def analyze_case(
    file: UploadFile = File(...),
    case_number: Optional[str] = Form(None),
    acknowledgement_no: Optional[str] = Form(None),
    victim_name: Optional[str] = Form(None),
    victim_account: Optional[str] = Form(None),
    victim_bank: Optional[str] = Form(None),
    total_fraud_amount: float = Form(0.0),
):
    """Process one PDF or Excel (.xlsx) document without authentication or permanent storage."""
    filename = file.filename or "analysis.pdf"
    lower_fn = filename.lower()
    if not (lower_fn.endswith(".pdf") or lower_fn.endswith(".xlsx")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supported documents are .pdf and .xlsx (Excel). Legacy .xls files are not supported \u2014 please re-save as .xlsx.",
        )
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document exceeds the 50 MB limit.")

    meta = {
        "file_name": filename,
        "case_number": (case_number or "").strip() or "TEMPORARY-ANALYSIS",
        "acknowledgement_no": (acknowledgement_no or "").strip(),
        "victim_name": (victim_name or "").strip(),
        "victim_account": (victim_account or "").strip(),
        "victim_bank": (victim_bank or "").strip(),
        "total_fraud_amount": total_fraud_amount,
    }

    if lower_fn.endswith(".xlsx"):
        return analyze_excel(content, meta)

    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid PDF document header.")

    return analyze_pdf(content, meta)


@router.get("/analysis/{analysis_id}")
async def read_analysis(analysis_id: str):
    result = get_analysis(analysis_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Temporary analysis expired.")
    return result


@router.delete("/analysis/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_analysis(analysis_id: str):
    delete_analysis(analysis_id)


@router.post("/analysis/{analysis_id}/export")
async def export_analysis(analysis_id: str):
    result = get_analysis(analysis_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Temporary analysis expired.")
    pdf_bytes = report_generator.generate_case_pdf_report(
        case_data=result["case"],
        accounts=result["accounts"],
        transactions=result["transactions"],
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=temporary_analysis_{analysis_id}.pdf"},
    )

