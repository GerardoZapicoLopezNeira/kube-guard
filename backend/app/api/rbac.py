# backend/app/api/rbac.py
from fastapi import APIRouter, Query
from app.services.rbac_service import run_rbac_analysis, get_rbac_policy_rules, who_can, get_all_bindings
from app.models.rbac import RbacFinding, RbacPolicyRule, RbacBinding
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

@router.get("/who-can")
def get_who_can(
    verb: str = Query(..., description="Verbo: get, list, delete, etc."),
    resource: str = Query(..., description="Recurso: pods, deployments, etc."),
    namespace: str = Query(None, description="Namespace, opcional")
):
    return who_can(verb, resource, namespace)

@router.get("/bindings", response_model=List[RbacBinding])
def list_bindings():
    return get_all_bindings()