# backend/app/services/rbac_service.py
"""
RBAC Service Module

This module provides business logic and service functions for Kubernetes RBAC
(Role-Based Access Control) analysis and querying. It interfaces with the
Kubernetes API and external tools to perform security analysis and retrieve
RBAC configuration information.

Key functionalities:
- Security analysis using rbac-tool
- Policy rule retrieval and analysis
- Permission queries and reverse lookups
- RBAC binding enumeration
- Role and ClusterRole rule extraction

Author: Gerardo Zapico
Date: July 2025
"""

from kubernetes import client
import subprocess, json
from kubernetes.client import V1ClusterRoleBinding, V1RoleBinding
import yaml
from app.models.rbac import K8sPolicyRule, RbacFinding, RbacPolicyRule, RbacBinding, RbacSubject, RbacRoleRef
from typing import Dict, List

def _setup_rbac_tool_env():
    """
    Set up environment variables for rbac-tool to use in-cluster authentication.
    
    When running inside a Kubernetes pod, rbac-tool needs to be configured
    to use the ServiceAccount token for cluster authentication. This function
    sets the necessary environment variables.
    """
    import os
    
    # Check if we're running in a Kubernetes pod
    if os.path.exists('/var/run/secrets/kubernetes.io/serviceaccount'):
        # Set KUBECONFIG to use in-cluster authentication
        # We'll create a minimal kubeconfig that points to the in-cluster config
        kubeconfig_content = """
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    server: https://kubernetes.default.svc
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
users:
- name: default
  user:
    tokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
"""
        # Write kubeconfig to a temporary file
        kubeconfig_path = "/tmp/kubeconfig"
        with open(kubeconfig_path, 'w') as f:
            f.write(kubeconfig_content)
        
        # Set KUBECONFIG environment variable
        os.environ['KUBECONFIG'] = kubeconfig_path
        return kubeconfig_path
    
    return None

def run_rbac_analysis() -> List[RbacFinding]:
    """
    Run comprehensive RBAC security analysis using rbac-tool.
    
    This function executes the rbac-tool to perform a cluster-wide
    analysis of RBAC configurations, identifying potential security issues,
    misconfigurations, and overly permissive roles.
    
    Returns:
        List[RbacFinding]: List of security findings with severity levels,
                          messages, and recommendations
                          
    Note:
        Requires rbac-tool to be installed and accessible in PATH.
        Falls back to empty list if the tool is unavailable or fails.
        Automatically configures in-cluster authentication when running in a pod.
    """
    try:
        # Set up in-cluster authentication for rbac-tool
        _setup_rbac_tool_env()
        
        # Execute rbac-tool analysis with JSON output
        result = subprocess.run(
            ["rbac-tool", "analysis", "-o", "json"],
            capture_output=True,
            check=True,
            timeout=30  # Prevent hanging on large clusters
        )
        
        # Parse JSON output and extract findings
        output = json.loads(result.stdout)
        findings = output.get("Findings", [])
        return [RbacFinding(**f) for f in findings]
    except Exception as e:
        # Log error and return empty list for graceful degradation
        print(f"[RBAC TOOL ERROR] {e}")
        return []

def fetch_rbac_policy_rules(subject: str) -> List[RbacPolicyRule]:
    """
    Retrieve RBAC policy rules for a specific subject.
    
    This function queries the cluster to find all policy rules that apply
    to a given subject (User, Group, or ServiceAccount), showing what
    permissions they have been granted.
    
    Args:
        subject (str): Name of the subject to query (e.g., "system:serviceaccount:default:myapp")
        
    Returns:
        List[RbacPolicyRule]: List of policy rules with allowed actions
        
    Raises:
        subprocess.CalledProcessError: If kubectl command fails
        json.JSONDecodeError: If output parsing fails
    """
    # Set up in-cluster authentication for rbac-tool
    _setup_rbac_tool_env()
    
    # Execute rbac-tool policy-rules command
    result = subprocess.run(
        ["rbac-tool", "policy-rules", "-o", "json", "-e", subject],
        capture_output=True, check=True, timeout=30
    )
    
    # Parse JSON output and convert to Pydantic models
    data = json.loads(result.stdout)
    return [RbacPolicyRule(**item) for item in data]

def remove_nulls(obj):
    """ 
    Recursively remove keys with None values from nested dictionaries and lists.
    
    This utility function cleans up Kubernetes API objects by removing
    null/None values, which helps reduce YAML output size and improves
    readability of serialized data.
    
    Args:
        obj: The object to clean (dict, list, or primitive type)
        
    Returns:
        Cleaned object with None values removed
    """
    if isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            v2 = remove_nulls(v)
            # Keep non-None values and non-empty collections
            if v2 is not None and (not isinstance(v2, (list, dict)) or v2):
                cleaned[k] = v2
        return cleaned
    elif isinstance(obj, list):
        # Recursively clean list items and filter out None/empty values
        cleaned_list = [remove_nulls(x) for x in obj]
        return [x for x in cleaned_list if x is not None and (not isinstance(x, (list, dict)) or x)]
    else:
        return obj

def who_can(verb: str, resource: str, namespace: str = None) -> List[Dict]:
    """
    Find all subjects who can perform a specific action on a resource.
    
    This function performs a reverse lookup to identify which users, groups,
    or service accounts have permission to perform a given verb on a specific
    resource type, optionally within a specific namespace.
    
    Args:
        verb (str): The action verb to check (get, list, create, update, delete, etc.)
        resource (str): The Kubernetes resource type (pods, services, deployments, etc.)
        namespace (str, optional): Limit search to a specific namespace
        
    Returns:
        List[Dict]: List of authorization rules with subject, namespace, and role info
        
    Algorithm:
        1. Retrieve all RoleBindings and ClusterRoleBindings
        2. Get all Roles and ClusterRoles
        3. For each binding, check if the referenced role allows the verb on the resource
        4. Collect subjects from matching bindings
    """
    rbac = client.RbacAuthorizationV1Api()
    authz_rules = []

    # Step 1: Get all RoleBindings and ClusterRoleBindings
    role_bindings = rbac.list_namespaced_role_binding(namespace=namespace).items if namespace else []
    cluster_role_bindings = rbac.list_cluster_role_binding().items

    # Step 2: Get all Roles and ClusterRoles
    roles = rbac.list_namespaced_role(namespace=namespace).items if namespace else []
    cluster_roles = rbac.list_cluster_role().items

    def matches_rule(rules, verb, resource):
        """
        Check if any rule in the list matches the specified verb and resource.
        
        Args:
            rules: List of PolicyRule objects
            verb (str): Verb to match against
            resource (str): Resource to match against
            
        Returns:
            bool: True if any rule matches, False otherwise
        """
        for rule in rules:
            verbs = rule.verbs or []
            resources = rule.resources or []

            # Check for exact match or wildcard permissions
            if (verb in verbs or "*" in verbs) and (resource in resources or "*" in resources):
                return True
        return False

    # Step 3: Process RoleBindings
    for rb in role_bindings:
        role_name = rb.role_ref.name
        role_kind = rb.role_ref.kind

        # Find the referenced role
        if role_kind == "Role":
            role = next((r for r in roles if r.metadata.name == role_name), None)
        elif role_kind == "ClusterRole":
            role = next((r for r in cluster_roles if r.metadata.name == role_name), None)
        else:
            continue

        # Skip if role not found or doesn't match the permission
        if not role or not matches_rule(role.rules, verb, resource):
            continue
        
        # Add subjects from matching RoleBinding
        if rb.subjects:
            for subject in rb.subjects:
                authz_rules.append({
                    "subject": f"{subject.kind}/{subject.name}",
                    "namespace": rb.metadata.namespace,
                    "role": f"{role_kind}/{role_name}"
                })

    # Step 4: Process ClusterRoleBindings
    for crb in cluster_role_bindings:
        # Find the referenced ClusterRole
        cr = next((r for r in cluster_roles if r.metadata.name == crb.role_ref.name), None)
        if not cr or not matches_rule(cr.rules, verb, resource):
            continue
            
        # Add subjects from matching ClusterRoleBinding
        if crb.subjects:
            for subject in crb.subjects:
                ns = getattr(subject, "namespace", None) or "cluster-wide"
                authz_rules.append({
                    "subject": f"{subject.kind}/{subject.name}",
                    "namespace": ns,
                    "role": f"{crb.role_ref.kind}/{crb.role_ref.name}"
                })

    return authz_rules

def get_all_bindings() -> List[RbacBinding]:
    """
    Retrieve all RBAC bindings in the cluster.
    
    This function fetches all RoleBindings and ClusterRoleBindings from the
    cluster and converts them to a standardized format with raw YAML data
    for detailed inspection.
    
    Returns:
        List[RbacBinding]: Complete list of RBAC bindings with subjects,
                          role references, and raw YAML representations
                          
    Note:
        This operation may be slow on clusters with many bindings.
        Each binding includes its raw YAML for debugging purposes.
    """
    rbac = client.RbacAuthorizationV1Api()
    bindings: List[RbacBinding] = []
    id_counter = 0

    # Process ClusterRoleBindings
    try:
        cluster_role_bindings = rbac.list_cluster_role_binding().items
    except client.exceptions.ApiException as e:
        print("[⚠️ RBAC] Cannot list ClusterRoleBindings:", e.status)
        cluster_role_bindings = []

    for crb in cluster_role_bindings:
        # Convert subjects to our model format
        subjects = [
            RbacSubject(
                kind=s.kind,
                name=s.name,
                apiGroup=s.api_group or "",
                namespace=getattr(s, "namespace", None)  # May be present for ServiceAccounts
            )
            for s in crb.subjects or []
        ]
        
        # Convert role reference
        role_ref = RbacRoleRef(
            kind=crb.role_ref.kind,
            name=crb.role_ref.name,
            apiGroup=crb.role_ref.api_group,
            namespace=None  # ClusterRole has no namespace
        )
        
        # Ensure required fields are set for YAML serialization
        crb.api_version = crb.api_version or 'rbac.authorization.k8s.io/v1'
        crb.kind = crb.kind or 'ClusterRoleBinding'
        
        # Clean up None values and serialize to YAML
        pruned = remove_nulls(crb.to_dict())
        raw_yaml = yaml.safe_dump(pruned, sort_keys=False)

        # Create binding model
        bindings.append(RbacBinding(
            id=id_counter,
            name=crb.metadata.name,
            kind="ClusterRoleBinding",
            subjects=subjects,
            roleRef=role_ref,
            raw=raw_yaml
        ))
        id_counter += 1

    # Process RoleBindings
    try:
        role_bindings = rbac.list_role_binding_for_all_namespaces().items
    except client.exceptions.ApiException as e:
        print("[⚠️ RBAC] Cannot list RoleBindings:", e.status)
        role_bindings = []

    for rb in role_bindings:
        binding_namespace = rb.metadata.namespace

        # Convert subjects with proper namespace handling
        subjects = [
            RbacSubject(
                kind=s.kind,
                name=s.name,
                apiGroup=s.api_group or "",
                namespace=getattr(s, "namespace", binding_namespace if s.kind == "ServiceAccount" else None)
            )
            for s in rb.subjects or []
        ]

        # Convert role reference with namespace for Roles
        role_ref = RbacRoleRef(
            kind=rb.role_ref.kind,
            name=rb.role_ref.name,
            apiGroup=rb.role_ref.api_group,
            namespace=binding_namespace if rb.role_ref.kind == "Role" else None
        )

        # Ensure required fields are set for YAML serialization
        rb.api_version = rb.api_version or 'rbac.authorization.k8s.io/v1'
        rb.kind = rb.kind or 'RoleBinding'
        
        # Clean up None values and serialize to YAML
        pruned = remove_nulls(rb.to_dict())
        raw_yaml = yaml.safe_dump(pruned, sort_keys=False)

        # Create binding model
        bindings.append(RbacBinding(
            id=id_counter,
            name=rb.metadata.name,
            kind="RoleBinding",
            subjects=subjects,
            roleRef=role_ref,
            raw=raw_yaml
        ))
        id_counter += 1

    return bindings

def fetch_rules_for_role(role_name: str, kind: str, namespace: str = None) -> List[K8sPolicyRule]:
    """
    Retrieve policy rules for a specific Role or ClusterRole.
    
    This function fetches the detailed policy rules defined in a specific
    Role or ClusterRole, showing what verbs are allowed on which resources
    and API groups.
    
    Args:
        role_name (str): Name of the Role or ClusterRole to query
        kind (str): Type of role - must be either "Role" or "ClusterRole"
        namespace (str, optional): Namespace (required for Roles, ignored for ClusterRoles)
        
    Returns:
        List[K8sPolicyRule]: List of policy rules with verbs, resources, and API groups
        
    Raises:
        ValueError: If role kind is unsupported or namespace is missing for Role
        kubernetes.client.exceptions.ApiException: If role is not found
        
    Example:
        # Get rules for a ClusterRole
        rules = fetch_rules_for_role("cluster-admin", "ClusterRole")
        
        # Get rules for a namespaced Role
        rules = fetch_rules_for_role("pod-reader", "Role", "default")
    """
    rbac = client.RbacAuthorizationV1Api()

    if kind == "ClusterRole":
        # Retrieve ClusterRole - namespace parameter is ignored
        role = rbac.read_cluster_role(role_name)
    elif kind == "Role":
        # Retrieve namespaced Role - namespace is required
        if not namespace:
            raise ValueError("Namespace is required for Role")
        role = rbac.read_namespaced_role(role_name, namespace)
    else:
        raise ValueError(f"Unsupported role kind: {kind}")

    # Extract policy rules and convert to our model format
    rules = role.rules or []
    return [K8sPolicyRule(**r.to_dict()) for r in rules]
