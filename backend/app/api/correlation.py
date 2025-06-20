# backend/app/api/correlation.py
from fastapi import APIRouter, Query
from typing import Optional, List
from app.services.correlation_service import correlate_risks
from app.models.correlation import CorrelatedRiskReport

router = APIRouter()

@router.get("/risk", response_model=List[CorrelatedRiskReport])
def list_correlated_risks(namespace: Optional[str] = Query(None)):
    return correlate_risks(namespace)
