# backend/app/api/rbac.py
from fastapi import APIRouter, Query
from app.services.rbac_tool_service import run_rbac_analysis, get_rbac_policy_rules
from app.models.rbac import RbacFinding, RbacPolicyRule
from typing import List

router = APIRouter()

@router.get("/analysis", response_model=List[RbacFinding], tags=["RBAC"])
def get_rbac_findings():
    return run_rbac_analysis()

@router.get("/policyrules", response_model=List[RbacPolicyRule], tags=["RBAC"])
def get_rbac_policy_rules(serviceaccount: str = Query(None, description="Filter by service account name")):
    """
    Retrieve all RBAC policy rules in the cluster.
    """
    return get_rbac_policy_rules(serviceaccount=serviceaccount)