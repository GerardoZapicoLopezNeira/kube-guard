# backend/app/services/rbac_service.py
from kubernetes import client
import subprocess, json
from kubernetes.client import V1ClusterRoleBinding, V1RoleBinding
import yaml
from app.models.rbac import RbacFinding, RbacPolicyRule, RbacBinding, RbacSubject, RbacRoleRef
from typing import Dict, List

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

def who_can(verb: str, resource: str, namespace: str = None) -> List[Dict]:
    rbac = client.RbacAuthorizationV1Api()
    authz_rules = []

    # 1. Obtener todos los RoleBindings y ClusterRoleBindings
    role_bindings = rbac.list_namespaced_role_binding(namespace=namespace).items if namespace else []
    cluster_role_bindings = rbac.list_cluster_role_binding().items

    # 2. Obtener todos los Roles y ClusterRoles
    roles = rbac.list_namespaced_role(namespace=namespace).items if namespace else []
    cluster_roles = rbac.list_cluster_role().items

    def matches_rule(rules, verb, resource):
        for rule in rules:
            verbs = rule.verbs or []
            resources = rule.resources or []

            if (verb in verbs or "*" in verbs) and (resource in resources or "*" in resources):
                return True
        return False



    # 3. Procesar RoleBindings
    for rb in role_bindings:
        role_name = rb.role_ref.name
        role_kind = rb.role_ref.kind

        if role_kind == "Role":
            role = next((r for r in roles if r.metadata.name == role_name), None)
        elif role_kind == "ClusterRole":
            role = next((r for r in cluster_roles if r.metadata.name == role_name), None)
        else:
            continue

        if not role or not matches_rule(role.rules, verb, resource):
            continue
        
        if rb.subjects:
            for subject in rb.subjects:
                authz_rules.append({
                    "subject": f"{subject.kind}/{subject.name}",
                    "namespace": rb.metadata.namespace,
                    "role": f"{role_kind}/{role_name}"
                })

    # 4. Procesar ClusterRoleBindings
    for crb in cluster_role_bindings:
        cr = next((r for r in cluster_roles if r.metadata.name == crb.role_ref.name), None)
        if not cr or not matches_rule(cr.rules, verb, resource):
            continue
        if crb.subjects:
            for subject in crb.subjects:
                authz_rules.append({
                    "subject": f"{subject.kind}/{subject.name}",
                    "namespace": "cluster-wide",
                    "role": f"ClusterRole/{crb.role_ref.name}"
                })

    return authz_rules

def get_all_bindings() -> List[RbacBinding]:
    rbac = client.RbacAuthorizationV1Api()
    bindings: List[RbacBinding] = []
    id_counter = 0

    cluster_role_bindings: List[V1ClusterRoleBinding] = rbac.list_cluster_role_binding().items
    for crb in cluster_role_bindings:
        subjects = [RbacSubject(kind=s.kind, name=s.name, apiGroup=s.api_group or "") for s in crb.subjects or []]
        role_ref = RbacRoleRef(kind=crb.role_ref.kind, name=crb.role_ref.name, apiGroup=crb.role_ref.api_group)

        raw_yaml = yaml.safe_dump(crb.to_dict(), sort_keys=False)

        bindings.append(RbacBinding(
            id=id_counter,
            name=crb.metadata.name,
            kind="ClusterRoleBinding",
            subjects=subjects,
            roleRef=role_ref,
            raw=raw_yaml
        ))
        id_counter += 1

    role_bindings: List[V1RoleBinding] = rbac.list_role_binding_for_all_namespaces().items
    for rb in role_bindings:
        subjects = [RbacSubject(kind=s.kind, name=s.name, apiGroup=s.api_group or "") for s in rb.subjects or []]
        role_ref = RbacRoleRef(kind=rb.role_ref.kind, name=rb.role_ref.name, apiGroup=rb.role_ref.api_group)

        raw_yaml = yaml.safe_dump(rb.to_dict(), sort_keys=False)

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