import os
import subprocess
import tempfile
import shutil
import yaml
import json
from kubernetes import client, config

def run(cmd):
    return subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True)

# --- Config
repo = os.environ["REPO"]
path = os.environ["PATH"]
ref = os.environ.get("REF", "main")
namespace = os.environ["NAMESPACE"]
scanners = os.environ["SCANNERS"].split(",")
name = os.environ["REQUEST_NAME"]

workdir = tempfile.mkdtemp()

try:
    # --- Clonar repositorio
    run(["git", "clone", "--depth=1", "--branch", ref, repo, workdir])
    chart_dir = os.path.join(workdir, path)

    # --- Renderizar el Helm chart
    rendered = os.path.join(tempfile.mkdtemp(), 'rendered.yaml')
    run(["helm", "template", chart_dir, "-n", namespace, "-f", "/dev/null", "-o", rendered])

    # --- Ejecutar los escáneres
    findings = {}
    if "kubelinter" in scanners:
        try:
            output = run(["kube-linter", "lint", chart_dir, "--format", "json"])
            findings["kubelinter"] = json.loads(output)
        except Exception as e:
            findings["kubelinter"] = [{"error": str(e)}]

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

    # --- Enviar el CR usando Kubernetes API
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
