# backend/app/services/correlation_service.py

from kubernetes import client
from typing import List, Optional, Tuple
from app.models.correlation import CorrelatedRiskReport
from app.services.trivy_service import get_trivy_reports
from app.services.rbac_tool_service import run_rbac_analysis
from app.models.trivy import TrivyReport
from app.models.rbac import RbacFinding

RISK_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

def get_service_account_for_resource(namespace: str, report_name: str) -> Optional[str]:
    kind, _ = report_name.split("-", 1)
    kind = kind.lower()
    v1 = client.CoreV1Api()
    apps_v1 = client.AppsV1Api()

    try:
        if kind == "pod":
            pods = v1.list_namespaced_pod(namespace).items
            for pod in pods:
                if pod.metadata.name in report_name:
                    return pod.spec.service_account_name

        elif kind == "replicaset":
            rss = apps_v1.list_namespaced_replica_set(namespace).items
            for rs in rss:
                if rs.metadata.name in report_name:
                    return rs.spec.template.spec.service_account_name

        elif kind == "deployment":
            deps = apps_v1.list_namespaced_deployment(namespace).items
            for dep in deps:
                if dep.metadata.name in report_name:
                    return dep.spec.template.spec.service_account_name

    except Exception as e:
        print(f"[ERROR] Could not retrieve SA for {report_name} in {namespace}: {e}")
    return None


def correlate_risks(namespace: Optional[str] = None) -> List[CorrelatedRiskReport]:
    trivy_reports = get_trivy_reports(namespace)
    rbac_findings = run_rbac_analysis()

    correlated = []

    for report in trivy_reports:
        # Obtener SA desde los pods con el controller como owner
        sa_name = get_service_account_for_resource(report.namespace, report.resource)
        if not sa_name:
            print(f"[WARN] No SA found for resource {report.resource} in {report.namespace}")
            continue

        # Filtrar findings de RBAC que coincidan con esa SA (como subject de tipo ServiceAccount o Group)
        matched_rbac = [
            f.Finding for f in rbac_findings
            if f.Subject.name == sa_name and (
                f.Subject.kind in ["ServiceAccount", "Group"]
                and (f.Subject.namespace in [None, report.namespace])
            )
        ]

        trivy_sev = _max_severity(report.summary)
        rbac_sev = _max_rbac_severity(matched_rbac)
        overall = _combine_risk(trivy_sev, rbac_sev)
        remediation = generate_remediation_tip(
            report.resource,
            report.summary.dict(),
            matched_rbac,
            overall
        )
        
        correlated.append(CorrelatedRiskReport(
            resource=report.resource,
            namespace=report.namespace,
            image=report.image,
            service_account=sa_name,
            trivy_summary=report.summary,
            trivy_findings=report.vulnerabilities,
            rbac_findings=matched_rbac or None,
            overall_risk=overall,
            remediation_tip=remediation
        ))

    return correlated

def generate_remediation_tip(resource: str, trivy_summary: dict, rbac_findings: list, risk: str) -> list[str]:
    tips = []

    if trivy_summary.get("critical", 0) > 0:
        tips.append("⚠️ Update the container image to the recommended fixed version to address critical vulnerabilities.")

    if any(f.Severity.upper() in ("CRITICAL", "HIGH") for f in rbac_findings):
        tips.append("🔒 Restrict the privileges of the associated ServiceAccount using least privilege principles.")

    if not tips:
        tips.append("✅ No critical issues found. No immediate action required.")

    if risk == "CRITICAL":
        tips.append("🔥 This resource has a high combined risk. Prioritize mitigation.")

    return tips


def _max_severity(summary):
    for sev in reversed(RISK_ORDER):
        if getattr(summary, sev.lower(), 0) > 0:
            return sev
    return "LOW"

def _max_rbac_severity(findings: List) -> str:
    severities = {f.Severity.upper() for f in findings}
    for sev in reversed(RISK_ORDER):
        if sev in severities:
            return sev
    return "LOW"

def _combine_risk(trivy_sev: str, rbac_sev: str) -> str:
    score = max(RISK_ORDER.index(trivy_sev), RISK_ORDER.index(rbac_sev))
    return RISK_ORDER[score]
