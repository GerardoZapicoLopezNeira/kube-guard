# backend/app/models/rbac.py
from pydantic import BaseModel
from typing import Optional, List

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

class RbacPolicyRule(BaseModel):
    apiGroups: List[str]
    resources: List[str]
    verbs: List[str]
    resourceNames: Optional[List[str]] = None
    nonResourceURLs: Optional[List[str]] = None
    namespace: Optional[str] = None

