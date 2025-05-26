# backend/app/services/kyverno_service.py
from kubernetes import client
from app.models.kyverno import PolicyViolation, KyvernoPolicySummary, KyvernoRule, KyvernoViolationSummary
from collections import defaultdict
from typing import List

def get_policy_violations(namespace: str = None) -> List[PolicyViolation]:
    k8s = client.CustomObjectsApi()
    group = "wgpolicyk8s.io"
    version = "v1alpha2"
    plural = "policyreports"

    if namespace:
        reports = k8s.list_namespaced_custom_object(group, version, namespace, plural)
    else:
        reports = k8s.list_cluster_custom_object(group, version, plural)

    violations = []
    policy_severities = get_policy_severities()

    for item in reports.get("items", []):
        ns = item.get("metadata", {}).get("namespace")
        scope = item.get("scope", {})
        results = item.get("results", [])

        for result in results:
            violations.append(PolicyViolation(
                policy=result.get("policy"),
                rule=result.get("rule"),
                result=result.get("result"),
                severity=policy_severities.get(result.get("policy"), "unknown"),
                message=result.get("message"),
                resource_kind=scope.get("kind"),
                resource_name=scope.get("name"),
                namespace=scope.get("namespace", ns)
            ))

    return violations

def get_policy_severities() -> dict:
    policies = list_cluster_policies()
    return {
        p.get("metadata", {}).get("name"): 
        p.get("metadata", {}).get("annotations", {}).get("kube-guard.io/severity", "unknown")
        for p in policies
    }

def list_cluster_policies():
    k8s = client.CustomObjectsApi()
    return client.ApiClient().sanitize_for_serialization(
        k8s.list_cluster_custom_object(
            group="kyverno.io",
            version="v1",
            plural="clusterpolicies"
        )
    ).get("items", [])

def get_policies_summary() -> List[KyvernoPolicySummary]:
    k8s = client.CustomObjectsApi()
    group = "kyverno.io"
    version = "v1"
    plural = "clusterpolicies"

    response = k8s.list_cluster_custom_object(group, version, plural)
    summaries = []

    for item in response.get("items", []):
        metadata = item.get("metadata", {})
        spec = item.get("spec", {})
        rules_raw = spec.get("rules", [])
        validation_action = spec.get("validationFailureAction", "Audit")
        rules = []

        for rule in rules_raw:
            name = rule.get("name", "")
            message = rule.get("validate", {}).get("message") or "No message"
            validation_type = "validate" if "validate" in rule else (
                "mutate" if "mutate" in rule else "generate" if "generate" in rule else "unknown"
            )

            match_kinds = []
            match = rule.get("match", {})
            any_match = match.get("any")
            if any_match:
                for m in any_match:
                    kinds = m.get("resources", {}).get("kinds", [])
                    match_kinds.extend(kinds)
            else:
                match_kinds = match.get("resources", {}).get("kinds", [])

            rules.append(KyvernoRule(
                name=name,
                match_kinds=match_kinds,
                validation_type=validation_type,
                message=message
            ))

        summaries.append(KyvernoPolicySummary(
            name=metadata.get("name"),
            validation_failure_action=validation_action,
            rules=rules
        ))

    return summaries

def get_violations_summary() -> List[KyvernoViolationSummary]:
    violations = get_policy_violations()
    summary = defaultdict(lambda: {"failures": 0, "severity": "unknown"})

    for v in violations:
        if v.result == "fail":
            summary[v.policy]["failures"] += 1
            summary[v.policy]["severity"] = v.severity  # La última prevalece, pero en teoría siempre es la misma

    return [
        KyvernoViolationSummary(
            policy=policy,
            severity=data["severity"],
            failures=data["failures"]
        )
        for policy, data in summary.items()
    ]
