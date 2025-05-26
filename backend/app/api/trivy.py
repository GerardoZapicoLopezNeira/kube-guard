# backend/app/api/trivy.py
from fastapi import APIRouter, Query
from typing import List
from app.services.trivy_service import get_trivy_reports
from app.models.trivy import TrivyReport

router = APIRouter()

@router.get("/reports", response_model=List[TrivyReport], tags=["Trivy"])
def list_reports(
    namespace: str = Query(None, description="Filter by namespace"),
    min_severity: str = Query("LOW", description="Minimum severity to include (LOW, MEDIUM, HIGH, CRITICAL)")
):
    return get_trivy_reports(namespace, min_severity=min_severity)
