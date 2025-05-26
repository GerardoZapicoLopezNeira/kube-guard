# backend/app/core/config.py

from kubernetes import config
import logging

def load_k8s_config():
    """
    Carga la configuración de Kubernetes.
    Intenta usar la configuración del clúster si está en ejecución dentro de uno,
    si no, usa la configuración local de kubeconfig (~/.kube/config).
    """
    try:
        config.load_incluster_config()
        logging.info("✅ Loaded in-cluster Kubernetes config.")
    except config.ConfigException:
        config.load_kube_config()
        logging.info("✅ Loaded local kubeconfig.")