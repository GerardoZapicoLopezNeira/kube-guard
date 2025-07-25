# backend/app/models/rbac.py
"""
RBAC Data Models Module

This module defines Pydantic models for representing Kubernetes RBAC (Role-Based Access Control)
data structures. These models are used for API request/response serialization and validation
throughout the Kube-Guard application.

The models cover:
- RBAC policy rules and permissions
- Security findings and recommendations  
- Subject and role binding relationships
- Kubernetes resource access patterns

Author: Gerardo Zapico
Date: July 2025
"""

from pydantic import BaseModel
from typing import Optional, List

class RbacOrigin(BaseModel):
    """
    Represents the origin source of an RBAC permission.
    
    Attributes:
        apiGroup (str): Kubernetes API group (e.g., 'apps', 'core')
        kind (str): Resource kind (e.g., 'Role', 'ClusterRole')
        name (str): Name of the RBAC resource
    """
    apiGroup: str
    kind: str
    name: str

class RbacAllowedAction(BaseModel):
    """
    Represents a specific action that is allowed by RBAC policies.
    
    Attributes:
        namespace (str): Target namespace for the action
        verb (str): Kubernetes verb (get, list, create, delete, etc.)
        apiGroup (Optional[str]): API group of the target resource
        resource (Optional[str]): Resource type (pods, services, etc.)
        nonResourceURI (Optional[str]): Non-resource URL path
        originatedFrom (List[RbacOrigin]): List of RBAC sources granting this permission
    """
    namespace: str
    verb: str
    apiGroup: Optional[str] = None
    resource: Optional[str] = None
    nonResourceURI: Optional[str] = None
    originatedFrom: List[RbacOrigin]

class Subject(BaseModel):
    """
    Represents a Kubernetes RBAC subject (User, Group, or ServiceAccount).
    
    Attributes:
        kind (str): Type of subject ('User', 'Group', 'ServiceAccount')
        name (str): Name of the subject
        namespace (Optional[str]): Namespace (required for ServiceAccounts)
        apiGroup (Optional[str]): API group for the subject
    """
    kind: str
    name: str
    namespace: Optional[str] = None
    apiGroup: Optional[str] = None

class FindingDetails(BaseModel):
    """
    Detailed information about a security finding.
    
    Attributes:
        Severity (str): Severity level ('High', 'Medium', 'Low')
        Message (str): Human-readable description of the finding
        Recommendation (str): Suggested remediation steps
        RuleName (str): Name of the security rule that triggered
        RuleUuid (str): Unique identifier for the rule
        References (Optional[List[str]]): Related documentation or CVE references
    """
    Severity: str
    Message: str
    Recommendation: str
    RuleName: str
    RuleUuid: str
    References: Optional[List[str]] = []

class RbacFinding(BaseModel):
    """
    Represents a security finding related to RBAC configuration.
    
    Attributes:
        Subject (Subject): The subject involved in the finding
        Finding (FindingDetails): Details about the security issue
    """
    Subject: Subject
    Finding: FindingDetails

class RbacFindingWithRules(RbacFinding):
    """
    Extended RBAC finding that includes detailed policy rules and context.
    
    Inherits from RbacFinding and adds:
        AllowedActions (List[RbacAllowedAction]): Actions permitted by the policy
        PolicyRules (List[RbacPolicyRule]): Detailed policy rules
        Namespace (Optional[str]): Target namespace
        Resource (Optional[str]): Target resource type
        ResourceName (Optional[str]): Specific resource name
        NonResourceURL (Optional[str]): Non-resource URL
        Verb (Optional[str]): Specific action verb
    """
    AllowedActions: List[RbacAllowedAction]
    PolicyRules: List['RbacPolicyRule']  
    Namespace: Optional[str] = None
    Resource: Optional[str] = None
    ResourceName: Optional[str] = None
    NonResourceURL: Optional[str] = None
    Verb: Optional[str] = None
    
class RbacPolicyRule(BaseModel):
    """
    Represents a policy rule with its allowed actions.
    
    Attributes:
        kind (str): Type of policy ('Role' or 'ClusterRole')
        name (str): Name of the policy
        namespace (Optional[str]): Namespace (for Roles only)
        allowedTo (List[RbacAllowedAction]): List of permitted actions
    """
    kind: str
    name: str
    namespace: Optional[str] = None
    allowedTo: List[RbacAllowedAction]

class K8sPolicyRule(BaseModel):
    """
    Represents a Kubernetes native policy rule structure.
    
    This mirrors the structure of PolicyRule from the Kubernetes API,
    defining what actions are allowed on which resources.
    
    Attributes:
        verbs (List[str]): List of allowed verbs (get, list, create, etc.)
        apiGroups (Optional[List[str]]): API groups the rule applies to
        resources (Optional[List[str]]): Resource types the rule applies to
        resourceNames (Optional[List[str]]): Specific resource names
        nonResourceURLs (Optional[List[str]]): Non-resource URL paths
    """
    verbs: List[str]
    apiGroups: Optional[List[str]] = []
    resources: Optional[List[str]] = []
    resourceNames: Optional[List[str]] = []
    nonResourceURLs: Optional[List[str]] = []

class RbacSubject(BaseModel):
    """
    Represents a subject in an RBAC binding.
    
    Attributes:
        kind (str): Subject type ('User', 'Group', 'ServiceAccount')
        name (str): Subject name
        apiGroup (Optional[str]): API group (typically empty for core subjects)
        namespace (Optional[str]): Namespace for ServiceAccounts
    """
    kind: str
    name: str
    apiGroup: Optional[str] = ""
    namespace: Optional[str] = None  # Namespace is optional for subjects

class RbacRoleRef(BaseModel):
    """
    Represents a reference to a Role or ClusterRole in a binding.
    
    Attributes:
        kind (str): Type of role ('Role' or 'ClusterRole')
        name (str): Name of the role
        apiGroup (Optional[str]): API group (typically 'rbac.authorization.k8s.io')
        namespace (Optional[str]): Namespace (for Role references)
    """
    kind: str
    name: str
    apiGroup: Optional[str] = ""
    namespace: Optional[str] = None  # Namespace is optional for role references

class RbacBinding(BaseModel):
    """
    Represents a complete RBAC binding (RoleBinding or ClusterRoleBinding).
    
    Attributes:
        id (int): Unique identifier for the binding
        name (str): Name of the binding
        kind (str): Type of binding ('RoleBinding' or 'ClusterRoleBinding')
        subjects (List[RbacSubject]): List of subjects bound to the role
        roleRef (RbacRoleRef): Reference to the role being bound
        raw (Optional[str]): Raw YAML representation of the binding
    """
    id: int
    name: str
    kind: str  # RoleBinding o ClusterRoleBinding
    subjects: List[RbacSubject]
    roleRef: RbacRoleRef
    raw: Optional[str] = None  # YAML raw data
