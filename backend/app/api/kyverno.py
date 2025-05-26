# backend/app/api/kyverno.py
from fastapi import APIRouter, Query
from typing import Optional
from app.services.kyverno_service import get_policy_violations, list_cluster_policies
from app.models.kyverno import PolicyViolation

router = APIRouter()

@router.get("/reports", response_model=list[PolicyViolation])
def list_policy_violations(namespace: Optional[str] = Query(None, description="Filter by namespace")):
    """Return Kyverno policy violations (from PolicyReports)"""
    return get_policy_violations(namespace)

@router.get("/policies")
def get_policies():
    """List all Kyverno ClusterPolicies currently installed"""
    return list_cluster_policies()

@router.get("/policies/summary")
def list_policies_summary():
    """Return a summarized view of Kyverno policies"""
    from app.services.kyverno_service import get_policies_summary
    return get_policies_summary()

@router.get("/violations/summary")
def get_violations_summary():
    """Return a summary of policy violations"""
    from app.services.kyverno_service import get_violations_summary
    return get_violations_summary()