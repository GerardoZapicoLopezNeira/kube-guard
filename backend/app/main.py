# backend/app/main.py
from fastapi import FastAPI
from app.api import trivy, kubebench, kyverno
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import load_k8s_config

app = FastAPI(title="Kube-Guard API")

# Cargar configuración del cliente de Kubernetes
def startup():
    load_k8s_config()

app.add_event_handler("startup", startup)

# CORS para desarrollo local con React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers por herramienta
app.include_router(trivy.router, prefix="/trivy", tags=["Trivy"])
# app.include_router(kubebench.router, prefix="/kubebench", tags=["Kube-Bench"])
app.include_router(kyverno.router, prefix="/kyverno", tags=["Kyverno"])

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
