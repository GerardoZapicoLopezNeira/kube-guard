import kopf
from kubernetes import config, client
from datetime import datetime
import uuid

# Init client (use incluster in prod)
config.load_kube_config()  # Para local. En cluster: load_incluster_config()

@kopf.on.create('kube-guard.io', 'v1alpha1', 'scanrequests')
def on_scan_create(spec, name, namespace, status, patch, logger, **kwargs):
    patch.status['phase'] = 'Starting'
    patch.status['startedAt'] = datetime.utcnow().isoformat() + 'Z'

    # Generar nombre de Job único
    suffix = str(uuid.uuid4())[:6]
    job_name = f"scan-job-{name}-{suffix}"

    # Construir Job en función de spec
    try:
        job = build_job(job_name, namespace, spec)
        client.BatchV1Api().create_namespaced_job(namespace=namespace, body=job)
        patch.status['phase'] = 'Running'
        patch.status['message'] = f"Scan job `{job_name}` launched."
    except Exception as e:
        patch.status['phase'] = 'Failed'
        patch.status['message'] = str(e)
        logger.error(f"Error creating scan job: {e}")

def build_job(job_name, namespace, spec):
    env_vars = [
        client.V1EnvVar(name="REPO", value=spec["source"].get("repo", "")),
        client.V1EnvVar(name="PATH", value=spec["source"]["path"]),
        client.V1EnvVar(name="REF", value=spec["source"].get("ref", "main")),
        client.V1EnvVar(name="SCANNERS", value=",".join(spec.get("scanners", []))),
        client.V1EnvVar(name="NAMESPACE", value=namespace),
        client.V1EnvVar(name="REQUEST_NAME", value=job_name),
    ]

    container = client.V1Container(
        name="scanner",
        image="kube-guard/scanner-job:dev",
        env=env_vars
    )

    pod_spec = client.V1PodSpec(
        containers=[container],
        restart_policy="Never"
    )

    template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(labels={"job": job_name}),
        spec=pod_spec
    )

    job_spec = client.V1JobSpec(template=template, backoff_limit=0)

    return client.V1Job(
        metadata=client.V1ObjectMeta(name=job_name, namespace=namespace),
        spec=job_spec
    )
