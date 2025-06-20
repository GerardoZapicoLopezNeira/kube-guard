# backend/app/models/correlation.py
from pydantic import BaseModel
from typing import Optional, List
from app.models.rbac import FindingDetails
from app.models.trivy import VulnerabilityFinding, TrivySummary

class CorrelatedRiskReport(BaseModel):
    resource: str
    namespace: str
    image: str
    service_account: Optional[str]
    trivy_summary: TrivySummary
    trivy_findings: List[VulnerabilityFinding]
    rbac_findings: Optional[List[FindingDetails]]
    overall_risk: str  # HIGH, MEDIUM, LOW, INFO
    remediation_tip: List[str] = []