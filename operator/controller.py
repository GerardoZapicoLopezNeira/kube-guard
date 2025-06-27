import kopf
import kubernetes
import uuid
from kubernetes import client, config
from datetime import datetime

def create_scan_job(name, namespace, spec):
    # Generar un sufijo único y nombre de Job
    unique_suffix = str(uuid.uuid4())[:6]
    job_name = f"scan-job-{name}-{unique_suffix}"

    env_vars = [
        client.V1EnvVar(name="REPO", value=spec["source"].get("repo", "")),
        client.V1EnvVar(name="PATH", value=spec["source"]["path"]),
        client.V1EnvVar(name="REF", value=spec["source"].get("ref", "main")),
        client.V1EnvVar(name="SCANNERS", value=",".join(spec.get("scanners", []))),
        client.V1EnvVar(name="RENDER_TYPE", value=spec.get("render", {}).get("type", "helm")),
        client.V1EnvVar(name="SCAN_REQUEST_NAME", value=name),
        client.V1EnvVar(name="SCAN_REQUEST_NAMESPACE", value=namespace),
    ]

    container = client.V1Container(
        name="scanner",
        image="scanner-job:dev",
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

    job_spec = client.V1JobSpec(
        template=template,
        backoff_limit=0
    )

    job = client.V1Job(
        metadata=client.V1ObjectMeta(name=job_name, namespace=namespace),
        spec=job_spec
    )

    return job


@kopf.on.create('kube-guard.io', 'v1alpha1', 'scanrequests')
def handle_scan_request(spec, meta, status, patch, logger, **kwargs):
    name = meta.get('name')
    namespace = meta.get('namespace')

    if not namespace:
        raise kopf.TemporaryError("Missing namespace in metadata", delay=30)

    # Inicializa K8s client (usa in-cluster config en despliegue real)
    config.load_incluster_config()
    batch = client.BatchV1Api()

    patch.status['phase'] = 'Running'
    patch.status['startedAt'] = datetime.utcnow().isoformat() + 'Z'

    try:
        job = create_scan_job(name, namespace, spec)
        batch.create_namespaced_job(namespace=namespace, body=job)
        logger.info(f"Created scan job: {job.metadata.name}")
        patch.status['message'] = "Scan job submitted"
        patch.status['phase'] = 'Pending'  # El Job debe cambiarlo después
    except Exception as e:
        logger.error(f"Failed to create scan job: {e}")
        patch.status['phase'] = 'Failed'
        patch.status['message'] = str(e)
