from pydantic import BaseModel
from typing import Optional, List

class PolicyViolation(BaseModel):
    policy: str
    rule: str
    result: str
    severity: Optional[str]
    message: Optional[str]
    resource_kind: str
    resource_name: str
    namespace: Optional[str]

class KyvernoRule(BaseModel):
    name: str
    match_kinds: List[str]
    message: str

class KyvernoPolicySummary(BaseModel):
    name: str
    validation_failure_action: str
    rules: List[KyvernoRule]

class KyvernoViolationSummary(BaseModel):
    policy: str
    severity: str
    failures: int