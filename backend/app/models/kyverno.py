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

    class Config:
        schema_extra = {
            "example": {
                "policy": "require-run-as-nonroot",
                "rule": "autogen-check-run-as-nonroot",
                "result": "fail",
                "severity": "high",
                "message": "Containers must not run as root",
                "resource_kind": "Deployment",
                "resource_name": "dvwa",
                "namespace": "apps-inseguras"
            }
        }

class KyvernoRule(BaseModel):
    name: str
    match_kinds: List[str]
    message: str

    class Config:
        schema_extra = {
            "example": {
                "name": "require-run-as-nonroot",
                "match_kinds": ["Pod"],
                "message": "Containers must not run as root"
            }
        }

class KyvernoPolicySummary(BaseModel):
    name: str
    validation_failure_action: str
    rules: List[KyvernoRule]

    class Config:
        schema_extra = {
            "example": {
                "name": "require-run-as-nonroot",
                "validation_failure_action": "Audit",
                "rules": [
                    {
                        "name": "autogen-check-run-as-nonroot",
                        "match_kinds": ["Pod"],
                        "message": "Containers must not run as root"
                    }
                ]
            }
        }

class KyvernoViolationSummary(BaseModel):
    policy: str
    severity: str
    failures: int

    class Config:
        schema_extra = {
            "example": {
                "policy": "require-run-as-nonroot",
                "severity": "high",
                "failures": 5
            }
        }