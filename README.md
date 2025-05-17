# 🛡️ Kube-Guard

**Kube-Guard** is a security auditing tool for Kubernetes clusters. It provides a web-based interface to launch and visualize vulnerability scans on container images and cluster configurations using tools like **Trivy** and **kube-bench**.

## 🚀 Features

- 🔍 Scan container images for known CVEs using [Trivy](https://github.com/aquasecurity/trivy)
- 🔒 Audit cluster configurations against CIS benchmarks using [kube-bench](https://github.com/aquasecurity/kube-bench)
- 📊 Web interface to launch scans and view detailed results
- 🧱 Deployable via Helm chart
- 🐳 Fully containerized (backend and frontend)

## 📦 Architecture

Kube-Guard consists of:

- **Frontend**: React-based dashboard
- **Backend**: Python FastAPI service that launches scan jobs and collects results
- **Security jobs**: Kubernetes Jobs for Trivy and kube-bench scans
- **Helm Chart**: for easy deployment on any Kubernetes cluster

## 🧑‍💻 Getting Started

### Prerequisites

- Kubernetes cluster (e.g., Minikube)
- kubectl configured
- Docker installed
- Helm v3+

### 1. Clone the repository

```bash
git clone https://github.com/your-org/kube-guard.git
cd kube-guard
