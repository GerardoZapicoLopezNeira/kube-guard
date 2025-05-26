# backend/app/models/trivy.py
from pydantic import BaseModel
from typing import Optional, List

class VulnerabilityFinding(BaseModel):
    id: str
    pkg: Optional[str] = None
    severity: str
    installed_version: Optional[str] = None
    fixed_version: Optional[str] = None
    title: Optional[str] = None

class TrivySummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    unknown: int = 0

class TrivyReport(BaseModel):
    resource: str
    namespace: str
    image: str
    summary: TrivySummary
    vulnerabilities: List[VulnerabilityFinding]