import os
import subprocess
import tempfile
import shutil
import yaml
import json
from kubernetes import client, config

def run(cmd):
    return subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True)

# --- Leer configuración desde variables de entorno
repo = os.environ["REPO"]
path = os.environ["PATH"]
ref = os.environ.get("REF", "main")
namespace = os.environ["SCAN_REQUEST_NAMESPACE"]
scanners = os.environ["SCANNERS"].split(",")
name = os.environ["SCAN_REQUEST_NAME"]

# --- Directorios temporales
workdir = tempfile.mkdtemp()
rendered_yaml = os.path.join(tempfile.mkdtemp(), "rendered.yaml")

try:
    # --- Clonar repositorio
    run(["git", "clone", "--depth=1", "--branch", ref, repo, workdir])
    chart_dir = os.path.join(workdir, path)

    # --- Renderizar Helm Chart → YAML plano
    with open(rendered_yaml, "w") as f:
        subprocess.run(["helm", "template", chart_dir, "-n", namespace, "-f", "/dev/null"], stdout=f, check=True)

    findings = {}

    # --- Ejecutar Trivy (config)
    if "trivy" in scanners:
        try:
            output = run(["trivy", "config", "--format", "json", "--input", rendered_yaml])
            findings["trivy"] = json.loads(output)
        except Exception as e:
            findings["trivy"] = [{"error": str(e)}]

    # --- Crear el objeto HelmScanReport
    report = {
        "apiVersion": "kube-guard.io/v1alpha1",
        "kind": "HelmScanReport",
        "metadata": {
            "name": f"{name}-report",
            "namespace": namespace
        },
        "spec": {
            "sourceRef": name,
            "findings": findings
        }
    }

    # --- Enviar el CR al API de Kubernetes
    config.load_incluster_config()
    api = client.CustomObjectsApi()
    api.create_namespaced_custom_object(
        group="kube-guard.io",
        version="v1alpha1",
        namespace=namespace,
        plural="helmscanreports",
        body=report
    )

except Exception as e:
    print(f"[ERROR] {e}", flush=True)
finally:
    shutil.rmtree(workdir, ignore_errors=True)
