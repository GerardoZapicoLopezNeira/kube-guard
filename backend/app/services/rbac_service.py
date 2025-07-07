# backend/app/services/rbac_tool.py
import subprocess, json
from kubernetes import client
from app.models.rbac import RbacFinding, RbacFindingWithRules, RbacAllowedAction, RbacAssessmentReport, RbacCheck, RbacOrigin, RbacSummary
from typing import List, Optional


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

def run_rbac_analysis_with_rules() -> List[RbacFindingWithRules]:
    findings_with_rules = []

    try:
        # Ejecutar el análisis
        result = subprocess.run(
            ["kubectl", "rbac-tool", "analysis", "-o", "json"],
            capture_output=True,
            check=True,
            timeout=30
        )
        findings_output = json.loads(result.stdout)
        findings = findings_output.get("Findings", [])

        for raw_finding in findings:
            finding = RbacFinding(**raw_finding)
            sa_name = finding.Subject.name

            try:
                # Ejecutar policy-rules por ServiceAccount
                policy_result = subprocess.run(
                    ["kubectl", "rbac-tool", "policy-rules", "-e", sa_name, "-o", "json"],
                    capture_output=True,
                    check=True,
                    timeout=10
                )
                policy_data = json.loads(policy_result.stdout)
                rules_data = policy_data[0].get("allowedTo", []) if policy_data else []

                rules: List[RbacAllowedAction] = []
                for r in rules_data:
                    origins = [RbacOrigin(**o) for o in r.get("originatedFrom", [])]
                    rule = RbacAllowedAction(
                        namespace=r.get("namespace"),
                        verb=r.get("verb"),
                        apiGroup=r.get("apiGroup"),
                        resource=r.get("resource"),
                        originatedFrom=origins
                    )
                    rules.append(rule)

                findings_with_rules.append(
                    RbacFindingWithRules(finding=finding, rules=rules)
                )
            except Exception as policy_err:
                print(f"[RBAC TOOL] Error fetching rules for SA {sa_name}: {policy_err}")
                findings_with_rules.append(
                    RbacFindingWithRules(finding=finding, rules=[])
                )

    except Exception as analysis_err:
        print(f"[RBAC TOOL] Error running analysis: {analysis_err}")

    return findings_with_rules


def fetch_rbac_assessment_reports(namespace: str = None) -> List[RbacAssessmentReport]:
    k8s = client.CustomObjectsApi()
    group = "aquasecurity.github.io"
    version = "v1alpha1"
    plural = "rbacassessmentreports"

    if namespace:
        response = k8s.list_namespaced_custom_object(group, version, namespace, plural)
    else:
        response = k8s.list_cluster_custom_object(group, version, plural)

    reports = []
    for item in response.get("items", []):
        metadata = item.get("metadata", {})
        report = item.get("report", {})
        checks_data = report.get("checks", [])
        summary_data = report.get("summary", {})

        checks = [RbacCheck(**check) for check in checks_data]
        summary = RbacSummary(
            critical=summary_data.get("criticalCount", 0),
            high=summary_data.get("highCount", 0),
            medium=summary_data.get("mediumCount", 0),
            low=summary_data.get("lowCount", 0)
        )

        rbac_report = RbacAssessmentReport(
            name=metadata.get("name", ""),
            namespace=metadata.get("namespace", ""),
            creation_timestamp=metadata.get("creationTimestamp", ""),
            resource_kind=item.get("kind", ""),
            resource_name=metadata.get("name", ""),
            uid=metadata.get("uid", ""),
            checks=checks,
            summary=summary
        )
        reports.append(rbac_report)

    return reports
