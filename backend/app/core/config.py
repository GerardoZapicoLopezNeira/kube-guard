# backend/app/core/config.py
"""
Kubernetes Configuration Module

This module handles the configuration setup for connecting to Kubernetes clusters.
It supports both in-cluster and local kubeconfig authentication methods,
automatically detecting the appropriate configuration based on the environment.

Author: Gerardo Zapico  
Date: July 2025
"""

from kubernetes import config
import logging

def load_k8s_config():
    """
    Load Kubernetes configuration for cluster access.
    
    This function attempts to load Kubernetes configuration in the following order:
    1. In-cluster configuration (when running inside a Kubernetes pod)
    2. Local kubeconfig file (typically ~/.kube/config for local development)
    
    The function automatically detects the environment and loads the appropriate
    configuration method. This enables the application to work both when deployed
    in a cluster and during local development.
    
    Raises:
        kubernetes.config.ConfigException: If both configuration methods fail
        
    Returns:
        None: Configuration is loaded globally for the kubernetes client
    """
    try:
        # Attempt to load in-cluster configuration first
        # This works when the application is running inside a Kubernetes pod
        config.load_incluster_config()
        logging.info("✅ Loaded in-cluster Kubernetes config.")
    except config.ConfigException:
        # Fallback to local kubeconfig file
        # This is used for local development and testing
        config.load_kube_config()
        logging.info("✅ Loaded local kubeconfig.")