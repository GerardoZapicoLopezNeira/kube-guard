import json
from pydantic import BaseModel
from typing import List, Optional

class MisconfigurationFinding(BaseModel):
    file: str
    message: str
    severity: str


    @staticmethod
    def from_trivy_config(raw: bytes) -> List["MisconfigurationFinding"]:
        data = json.loads(raw)
        findings = []
        for result in data.get("Results", []):
            target_file = result.get("Target", "")
            for misconf in result.get("Misconfigurations", []):
                findings.append(MisconfigurationFinding(
                    file=target_file,
                    message=misconf.get("Message", "No message"),
                    severity=misconf.get("Severity", "UNKNOWN")
                ))
        return findings

class CVEDetail(BaseModel):
    id: str
    title: str
    severity: str
    pkg_name: str
    installed_version: str
    fixed_version: Optional[str]

class ImageScanResult(BaseModel):
    image: str
    critical: int
    high: int
    medium: int
    vulnerabilities: List[CVEDetail]

    @staticmethod
    def from_trivy_json(raw: bytes, image: str) -> "ImageScanResult":
        data = json.loads(raw)
        vulns = []
        critical = high = medium = 0

        for result in data.get("Results", []):
            for vuln in result.get("Vulnerabilities", []):
                sev = vuln.get("Severity", "").upper()
                if sev == "CRITICAL":
                    critical += 1
                elif sev == "HIGH":
                    high += 1
                elif sev == "MEDIUM":
                    medium += 1

                vulns.append(CVEDetail(
                    id=vuln.get("VulnerabilityID", "UNKNOWN"),
                    title=vuln.get("Title", vuln.get("Description", "")),
                    severity=sev,
                    pkg_name=vuln.get("PkgName", "UNKNOWN"),
                    installed_version=vuln.get("InstalledVersion", "UNKNOWN"),
                    fixed_version=vuln.get("FixedVersion")
                ))

        return ImageScanResult(
            image=image,
            critical=critical,
            high=high,
            medium=medium,
            vulnerabilities=vulns
        )


class RbacScanResult(BaseModel):
    severity: str
    message: str

    @staticmethod
    def from_json(raw: bytes) -> List["RbacScanResult"]:
        data = json.loads(raw)
        return [RbacScanResult(**item) for item in data]


class OfflineScanResult(BaseModel):
    release_name: str
    namespace: str
    images: List[ImageScanResult]
    # rbac_findings: List[RbacScanResult]
    misconfig_findings: List[MisconfigurationFinding]



