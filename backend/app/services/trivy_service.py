# backend/app/services/trivy_service.py
from kubernetes import client
from app.models.trivy import TrivyReport, TrivySummary, VulnerabilityFinding
from typing import List

SEVERITY_MAP = {
    "UNKNOWN": 0,
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4
}

def get_trivy_reports(namespace: str = None, min_severity: str = "LOW") -> List[TrivyReport]:
    k8s = client.CustomObjectsApi()
    group = "aquasecurity.github.io"
    version = "v1alpha1"
    plural = "vulnerabilityreports"

    if namespace:
        response = k8s.list_namespaced_custom_object(group, version, namespace, plural)
    else:
        response = k8s.list_cluster_custom_object(group, version, plural)

    min_severity_index = SEVERITY_MAP.get(min_severity.upper(), 0)

    reports = []

    for item in response.get("items", []):
        metadata = item.get("metadata", {})
        report = item.get("report", {})
        artifact = report.get("artifact", {})

        findings = []
        for vuln in report.get("vulnerabilities", []):
            sev = vuln.get("severity", "UNKNOWN").upper()
            if sev not in SEVERITY_MAP:
                continue
            if SEVERITY_MAP[sev] >= min_severity_index:
                findings.append(VulnerabilityFinding(
                    id=vuln.get("vulnerabilityID", ""),
                    pkg=vuln.get("pkgName"),
                    severity=sev,
                    installed_version=vuln.get("installedVersion"),
                    fixed_version=vuln.get("fixedVersion"),
                    title=vuln.get("title")
                ))

        if not findings:
            continue

        summary = TrivySummary(
            critical=sum(1 for f in findings if f.severity == "CRITICAL"),
            high=sum(1 for f in findings if f.severity == "HIGH"),
            medium=sum(1 for f in findings if f.severity == "MEDIUM"),
            low=sum(1 for f in findings if f.severity == "LOW"),
            unknown=sum(1 for f in findings if f.severity == "UNKNOWN")
        )

        reports.append(TrivyReport(
            resource=metadata.get("name"),
            namespace=metadata.get("namespace"),
            image=f"{artifact.get('repository', '')}:{artifact.get('tag', '')}",
            summary=summary,
            vulnerabilities=findings
        ))

    return reports
