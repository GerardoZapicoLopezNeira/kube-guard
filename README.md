# 🛡️ Kube-Guard

**Kube-Guard** is a Kubernetes-native security auditing and policy enforcement tool. It provides a web dashboard to monitor and manage container and cluster-level security using tools like **Trivy**, **kube-bench**, and **Kyverno**.

## 🚀 Features

- 🔍 CVE scanning on deployed container images using [Trivy Operator](https://github.com/aquasecurity/trivy-operator)
- 🔒 Audit misconfigurations with [kube-bench](https://github.com/aquasecurity/kube-bench)
- ⚖️ Policy violation reporting using [Kyverno](https://kyverno.io/)
- 📊 Dashboard to view vulnerabilities and misconfigurations by namespace/severity
- 💬 Summary endpoints to integrate into future frontend
- 🔁 Policy management (view, enforce mode, violation insights)

## 📦 Architecture

- **Frontend**: React-based SPA
- **Backend**: FastAPI app exposing security endpoints
- **Operators**:
  - Trivy Operator (image scanning)
  - Kyverno (policy engine)
- **Deployment**: Minikube (for local dev), Helm (for production-ready)

> See `docs/architecture.md` for diagrams and flow.

## 🧑‍💻 Getting Started

### Prerequisites

- Kubernetes cluster (e.g. Minikube)
- Docker
- Helm v3
- Python 3.12 with `poetry` or `venv`

### Quickstart (dev)

```bash
# Clone
git clone https://github.com/your-org/kube-guard.git
cd kube-guard

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
