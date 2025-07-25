# backend/app/main.py
"""
Kube-Guard API Main Application Module

This module serves as the entry point for the Kube-Guard FastAPI application.
It configures the FastAPI app, middleware, routers, and startup events for
analyzing Kubernetes RBAC configurations and security vulnerabilities.

Author: Gerardo Zapico
Date: July 2025
"""

from fastapi import FastAPI
from app.api import rbac
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import load_k8s_config

# Initialize FastAPI application with title and documentation
app = FastAPI(
    title="Kube-Guard API",
    description="A security analysis tool for Kubernetes RBAC configurations",
    version="1.0.0"
)

# Add health endpoints for Kubernetes
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness probe"""
    return {"status": "healthy", "service": "kube-guard-backend"}

@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint for Kubernetes readiness probe"""
    try:
        # Simple check - if we can import our modules, we're ready
        from app.services.rbac_service import get_all_bindings
        return {"status": "ready", "service": "kube-guard-backend"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Service not ready")

@app.get("/metrics")
async def metrics():
    """Basic metrics endpoint (simple text format)"""
    return {"metrics": "# HELP kube_guard_up Application status\nkube_guard_up 1\n"}

def startup():
    """
    Application startup event handler.
    
    Loads Kubernetes configuration on application startup to establish
    connection with the cluster. This is called once when the server starts.
    """
    load_k8s_config()

# Register startup event handler
app.add_event_handler("startup", startup)

# Configure CORS middleware for frontend communication
# Note: In production, replace "*" with specific frontend URLs for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(rbac.router, prefix="/rbac", tags=["RBAC"])
