import subprocess, tempfile, os, json, yaml, logging, shutil
from typing import List
from app.models.offline import OfflineScanResult, ImageScanResult, RbacScanResult, MisconfigurationFinding

logger = logging.getLogger(__name__)

def scan_all_releases() -> list[OfflineScanResult]:
    output = subprocess.check_output(["helm", "list", "-A", "--output", "json"])
    releases = json.loads(output)

    results = []
    for release in releases:
        try:
            name = release["name"]
            namespace = release["namespace"]
            logger.info(f"🔎 Scanning release {name} in namespace {namespace}")
            manifest = subprocess.check_output(["helm", "get", "manifest", name, "-n", namespace])
            result = scan_release_manifest(name, namespace, manifest.decode())
            results.append(result)
        except Exception as e:
            logger.warning(f"⚠️ Failed to scan {release['name']}: {e}")
            continue

    return results

def scan_release_manifest(name: str, namespace: str, manifest: str) -> OfflineScanResult:
    tmpdir = tempfile.mkdtemp(prefix="manifest-")
    manifest_path = os.path.join(tmpdir, "manifest.yaml")
    with open(manifest_path, "w") as f:
        f.write(manifest)

    images = extract_images_from_yaml(tmpdir)
    image_results = scan_images(images)
    # rbac_findings = analyze_rbac_from_yaml(tmpdir)
    misconfigs = scan_misconfig(tmpdir)

    shutil.rmtree(tmpdir, ignore_errors=True)

    return OfflineScanResult(
        release_name=name,
        namespace=namespace,
        images=image_results,
        # rbac_findings=rbac_findings,
        misconfig_findings=misconfigs
    )

def extract_images_from_yaml(yaml_dir: str) -> list[str]:
    images = set()
    for root, _, files in os.walk(yaml_dir):
        for f in files:
            if f.endswith((".yaml", ".yml")):
                with open(os.path.join(root, f)) as stream:
                    for doc in yaml.safe_load_all(stream):
                        if not doc or not isinstance(doc, dict):
                            continue
                        spec = doc.get("spec", {})
                        template = spec.get("template", {})
                        containers = template.get("spec", {}).get("containers", [])
                        for c in containers:
                            img = c.get("image")
                            if img: images.add(img)
    logger.info("🧾 Found %d images", len(images))
    return list(images)

def scan_images(images: list[str]) -> list[ImageScanResult]:
    results = []
    for img in images:
        try:
            logger.info(f"🚀 Scanning image {img}")
            out = subprocess.check_output(["trivy", "image", "--quiet", "--format", "json", img], timeout=120)
            results.append(ImageScanResult.from_trivy_json(out, img))
        except Exception as e:
            logger.error(f"❌ Trivy scan failed for {img}: {e}")
    return results

def analyze_rbac_from_yaml(yaml_dir: str) -> list[RbacScanResult]:
    findings = []
    for root, _, files in os.walk(yaml_dir):
        for f in files:
            if f.endswith((".yaml", ".yml")):
                with open(os.path.join(root, f)) as stream:
                    for doc in yaml.safe_load_all(stream):
                        if doc and doc.get("kind") in ("Role", "ClusterRole"):
                            rules = doc.get("rules", [])
                            for rule in rules:
                                if "*" in rule.get("verbs", []):
                                    findings.append(RbacScanResult(
                                        severity="High",
                                        message=f"{doc['kind']} {doc['metadata']['name']} allows all verbs"
                                    ))
    return findings


def scan_misconfig(yaml_dir: str) -> list[MisconfigurationFinding]:
    try:
        out = subprocess.check_output(["trivy", "config", "--format", "json", yaml_dir], timeout=120)
        return MisconfigurationFinding.from_trivy_config(out)
    except Exception as e:
        logger.error(f"❌ Trivy config scan failed: {e}")
        return []


