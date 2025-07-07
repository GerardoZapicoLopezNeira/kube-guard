# backend/app/api/rbac.py
from fastapi import APIRouter, Query
from app.services.rbac_service import run_rbac_analysis, run_rbac_analysis_with_rules, fetch_rbac_assessment_reports
from app.models.rbac import RbacFinding, RbacFindingWithRules, RbacAssessmentReport
from typing import List, Optional

router = APIRouter()

@router.get("/analysis", response_model=List[RbacFinding], tags=["RBAC"])
def get_rbac_findings():
    return run_rbac_analysis()

@router.get("/findings", response_model=List[RbacFindingWithRules], tags=["RBAC"])
def get_rbac_policy_rules(serviceaccount: str = Query(None, description="Filter by service account name")):
    """
    Retrieve all RBAC policy rules in the cluster.
    """
    return run_rbac_analysis_with_rules()

@router.get("/rbacassessmentreports", response_model=List[RbacAssessmentReport], tags=["RBAC"])
def get_rbac_assessment_reports(namespace: Optional[str] = Query(None, description="Filter by namespace")):
    """
    Retrieve all RBAC assessment reports.
    """
    return fetch_rbac_assessment_reports(namespace=namespace)