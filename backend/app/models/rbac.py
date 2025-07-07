# backend/app/models/rbac.py
from pydantic import BaseModel
from typing import Optional, List

class RbacOrigin(BaseModel):
    apiGroup: str
    kind: str
    name: str

class RbacAllowedAction(BaseModel):
    namespace: Optional[str]
    verb: str
    apiGroup: Optional[str]
    resource: Optional[str]
    originatedFrom: List[RbacOrigin]

class Subject(BaseModel):
    kind: str
    name: str
    namespace: Optional[str] = None
    apiGroup: Optional[str] = None

class FindingDetails(BaseModel):
    Severity: str
    Message: str
    Recommendation: str
    RuleName: str
    RuleUuid: str
    References: Optional[List[str]] = []

class RbacFinding(BaseModel):
    Subject: Subject
    Finding: FindingDetails

class RbacFindingWithRules(BaseModel):
    finding: RbacFinding
    rules: List[RbacAllowedAction]

class RbacCheck(BaseModel):
    checkID: str
    title: str
    description: str
    category: str
    severity: str
    success: bool
    remediation: str
    messages: List[str]

class RbacSummary(BaseModel):
    critical: int
    high: int
    medium: int
    low: int

class RbacAssessmentReport(BaseModel):
    name: str
    namespace: str
    creation_timestamp: str
    resource_kind: str
    resource_name: str
    uid: str
    checks: List[RbacCheck]
    summary: RbacSummary



    
