# backend/app/api/kyverno.py
from fastapi import APIRouter, Query
from typing import Optional
from app.services.kyverno_service import get_policy_violations, list_cluster_policies
from app.models.kyverno import KyvernoPolicySummary, KyvernoViolationSummary, PolicyViolation

router = APIRouter()

@router.get("/reports", response_model=list[PolicyViolation], tags=["Kyverno"])
def list_policy_violations(namespace: Optional[str] = Query(None, description="Filter by namespace")):
    """
    Get all Kyverno policy violations from PolicyReports in the given namespace.
    If no namespace is specified, it will return violations from all namespaces.
    """
    return get_policy_violations(namespace)

@router.get("/policies", response_model=list[dict], tags=["Kyverno"])
def get_policies():
    """List all Kyverno ClusterPolicies currently installed"""
    return list_cluster_policies()

@router.get("/policies/summary", response_model=list[KyvernoPolicySummary], tags=["Kyverno"])
def list_policies_summary():
    """Return a summarized view of Kyverno policies"""
    from app.services.kyverno_service import get_policies_summary
    return get_policies_summary()

@router.get("/violations/summary", response_model=list[KyvernoViolationSummary], tags=["Kyverno"])
def get_violations_summary():
    """Return a summary of policy violations"""
    from app.services.kyverno_service import get_violations_summary
    return get_violations_summary()