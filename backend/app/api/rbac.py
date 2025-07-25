# backend/app/api/rbac.py
"""
RBAC API Endpoints Module

This module defines the FastAPI router and endpoints for RBAC (Role-Based Access Control)
analysis and management. It provides REST API endpoints for analyzing Kubernetes RBAC
configurations, retrieving policy rules, and querying permissions.

The API endpoints include:
- RBAC security analysis and findings
- Policy rule retrieval for subjects
- Permission queries ("who can" operations)
- RBAC binding enumeration
- Role-specific rule retrieval

Author: Gerardo Zapico
Date: July 2025
"""

from fastapi import APIRouter, Query
from typing import Dict, List

from app.services.rbac_service import (
    fetch_rules_for_role,
    run_rbac_analysis,
    fetch_rbac_policy_rules,
    who_can,
    get_all_bindings,
)
from app.models.rbac import (
    K8sPolicyRule,
    RbacFinding,
    RbacPolicyRule,
    RbacBinding,
)

# Initialize API router for RBAC endpoints
router = APIRouter()

# --- RBAC Security Analysis Endpoint ---

@router.get(
    "/analysis",
    response_model=List[RbacFinding],
    tags=["RBAC"],
    summary="Get RBAC security analysis findings"
)
def get_rbac_findings():
    """
    Retrieve RBAC security analysis findings from the cluster.
    
    This endpoint runs a comprehensive security analysis of the cluster's RBAC
    configuration and returns a list of security findings, vulnerabilities,
    and misconfigurations that may pose security risks.
    
    Returns:
        List[RbacFinding]: List of security findings with details about
                          subjects, severity, and recommendations
                          
    Raises:
        HTTPException: If the analysis fails or kubectl rbac-tool is unavailable
    """
    return run_rbac_analysis()

@router.get(
    "/policy-rules",
    response_model=List[RbacPolicyRule],
    tags=["RBAC"],
    summary="Get policy rules for a subject"
)
def get_rbac_policy_rules(
    subject: str = Query(..., description="Subject name, e.g. 'kubescape'")
):
    """
    Retrieve RBAC policy rules for a specific subject.
    
    This endpoint returns all policy rules that apply to a given subject
    (User, Group, or ServiceAccount), showing what actions they are allowed
    to perform and on which resources.
    
    Args:
        subject (str): Name of the subject to query policy rules for
        
    Returns:
        List[RbacPolicyRule]: List of policy rules with allowed actions
                             and their origins
                             
    Raises:
        HTTPException: If the subject is not found or query fails
    """
    return fetch_rbac_policy_rules(subject=subject)

@router.get(
    "/who-can",
    response_model=List[Dict],
    tags=["RBAC"],
    summary="Find subjects who can perform an action"
)
def get_who_can(
    verb: str = Query(..., description="Action verb, e.g. get, list, delete"),
    resource: str = Query(..., description="Kubernetes resource, e.g. pods, deployments"),
    namespace: str = Query(None, description="Namespace (optional)")
):
    """
    Find all subjects who can perform a specific action on a resource.
    
    This is a reverse lookup that identifies which users, groups, or service
    accounts have permission to perform a given verb on a specific resource
    type, optionally within a specific namespace.
    
    Args:
        verb (str): The action verb to check (get, list, create, update, delete, etc.)
        resource (str): The Kubernetes resource type (pods, services, deployments, etc.)
        namespace (str, optional): Limit search to a specific namespace
        
    Returns:
        List[Dict]: List of authorization rules showing subjects with the permission
                   Each dict contains subject, namespace, and role information
                   
    Example:
        GET /rbac/who-can?verb=delete&resource=pods&namespace=default
        Returns all subjects who can delete pods in the default namespace
    """
    return who_can(verb, resource, namespace)

@router.get(
    "/bindings",
    response_model=List[RbacBinding],
    tags=["RBAC"],
    summary="List all RBAC bindings"
)
def list_bindings():
    """
    Retrieve all RBAC bindings in the cluster.
    
    This endpoint returns a comprehensive list of all RoleBindings and
    ClusterRoleBindings in the cluster, including their subjects, role
    references, and raw YAML representations.
    
    Returns:
        List[RbacBinding]: Complete list of RBAC bindings with subjects,
                          role references, and metadata
                          
    Note:
        This operation may take time in clusters with many bindings.
        The raw YAML data is included for detailed inspection.
    """
    return get_all_bindings()

@router.get(
    "/roles",
    response_model=List[K8sPolicyRule],
    tags=["RBAC"],
    summary="Get rules for a specific role"
)
def get_rules_for_role(
    role_name: str = Query(..., description="Role name"),
    kind: str = Query(..., description="Role kind (Role/ClusterRole)"),
    namespace: str = Query(None, description="Namespace (optional)")
):
    """
    Retrieve policy rules for a specific Role or ClusterRole.
    
    This endpoint returns the detailed policy rules defined in a specific
    Role or ClusterRole, showing what verbs are allowed on which resources.
    
    Args:
        role_name (str): Name of the Role or ClusterRole
        kind (str): Type of role - must be either "Role" or "ClusterRole"
        namespace (str, optional): Namespace (required for Roles, ignored for ClusterRoles)
        
    Returns:
        List[K8sPolicyRule]: List of policy rules with verbs, resources,
                            and API groups
                            
    Raises:
        HTTPException: If role is not found or parameters are invalid
        ValueError: If namespace is required but not provided for Role kind
        
    Example:
        GET /rbac/roles?role_name=admin&kind=ClusterRole
        Returns all policy rules for the cluster-admin ClusterRole
    """
    return fetch_rules_for_role(role_name, kind, namespace)

@router.get(
    "/policy-rules/batch",
    response_model=Dict[str, List[RbacPolicyRule]],
    tags=["RBAC"],
    summary="Get policy rules for multiple subjects"
)
def get_batch_policy_rules(
    subjects: List[str] = Query(..., description="List of subject names to query")
):
    """
    Retrieve RBAC policy rules for multiple subjects in a single request.
    
    This endpoint optimizes the policy rule retrieval by accepting multiple
    subject names via query parameters and returning their policy rules in a single response,
    reducing the number of HTTP requests from N to 1.
    
    Args:
        subjects (List[str]): List of subject names to query policy rules for
        
    Returns:
        Dict[str, List[RbacPolicyRule]]: Dictionary mapping subject names to their policy rules
        
    Example:
        GET /rbac/policy-rules/batch?subjects=user1&subjects=group1&subjects=system:serviceaccount:default
        
        Returns: {
            "user1": [...],
            "group1": [...],
            "system:serviceaccount:default:app1": [...]
        }
        
    Note:
        Be aware of URL length limitations when querying many subjects.
        Consider using shorter subject names or fewer subjects per request if you encounter issues.
    """
    results = {}
    
    for subject in subjects:
        try:
            rules = fetch_rbac_policy_rules(subject=subject)
            results[subject] = rules
        except Exception as e:
            # En lugar de fallar completamente, registrar el error y continuar
            print(f"[ERROR] Failed to fetch policy rules for subject '{subject}': {e}")
            results[subject] = []  # Retornar lista vacía en caso de error
    
    return results

@router.post(
    "/policy-rules/batch",
    response_model=Dict[str, List[RbacPolicyRule]],
    tags=["RBAC"],
    summary="Get policy rules for multiple subjects (fallback for large requests)"
)
def get_batch_policy_rules_post(
    subjects: List[str]
):
    """
    Retrieve RBAC policy rules for multiple subjects via POST body.
    
    This is a fallback endpoint for when the GET version would result in URLs that are too long.
    Functionally identical to the GET version but accepts subjects in the request body.
    
    Args:
        subjects (List[str]): List of subject names to query policy rules for
        
    Returns:
        Dict[str, List[RbacPolicyRule]]: Dictionary mapping subject names to their policy rules
        
    Example:
        POST /rbac/policy-rules/batch
        Body: ["user1", "group1", "system:serviceaccount:default:app1"]
        
        Returns: {
            "user1": [...],
            "group1": [...],
            "system:serviceaccount:default:app1": [...]
        }
    """
    results = {}
    
    for subject in subjects:
        try:
            rules = fetch_rbac_policy_rules(subject=subject)
            results[subject] = rules
        except Exception as e:
            print(f"[ERROR] Failed to fetch policy rules for subject '{subject}': {e}")
            results[subject] = []
    
    return results