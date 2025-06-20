# backend/app/services/rbac_tool.py
import subprocess, json
from app.models.rbac import RbacFinding, RbacPolicyRule
from typing import List

def run_rbac_analysis() -> List[RbacFinding]:
    try:
        result = subprocess.run(
            ["kubectl", "rbac-tool", "analysis", "-o", "json"],
            capture_output=True,
            check=True,
            timeout=30
        )
        output = json.loads(result.stdout)
        findings = output.get("Findings", [])
        return [RbacFinding(**f) for f in findings]
    except Exception as e:
        print(f"[RBAC TOOL ERROR] {e}")
        return []

def get_rbac_policy_rules() -> List[RbacPolicyRule]:
    try:
        result = subprocess.run(
            ["kubectl", "rbac-tool", "policyrules", "-o", "json"],
            capture_output=True,
            check=True,
            timeout=30
        )
        output = json.loads(result.stdout)
        rules = output.get("PolicyRules", [])
        return [RbacPolicyRule(**r) for r in rules]
    except Exception as e:
        print(f"[RBAC TOOL ERROR] {e}")
        return []
