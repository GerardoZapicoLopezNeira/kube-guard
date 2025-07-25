# KubeGuard - RBAC Security Analysis Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/python-v3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)

KubeGuard is a tool for auditing and analyzing Kubernetes RBAC (Role-Based Access Control) configurations. It provides visualization, analysis, and recommendations for improving cluster security through better RBAC configuration.

## 🎯 Features

- **Security Analysis**: Comprehensive RBAC security findings and vulnerability detection through the use of rbac-tool analysis
- **Interactive Visualization**: D3.js-powered graph visualization of RBAC relationships
- **Performance Optimized**: Intelligent batch loading and caching for large datasets
- **Modern UI**: Responsive interface built with React and TypeScript
- **Export Capabilities**: Export visualizations as SVG or DOT format
- **Real-time Filtering**: Advanced filtering by subjects, resources, verbs, and namespaces

## 🏗️ Architecture

```
kube-guard/
├── backend/          # Python FastAPI backend
│   ├── app/
│   │   ├── api/      # REST API endpoints
│   │   ├── core/     # Configuration and settings
│   │   ├── models/   # Data models and schemas
│   │   └── services/ # Business logic and RBAC analysis
│   └── requirements.txt
├── frontend/         # React TypeScript frontend
│   └── kube-guard-frontend/
│       ├── src/
│       │   ├── components/  # UI components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── services/    # API communication
│       │   ├── stores/      # Zustand global state
│       │   └── types/       # TypeScript definitions
│       └── package.json
└── docs/            # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Kubernetes cluster access
- `kubectl` configured
- `rbac-tool` installed (as kubectl plugin via krew or standalone)

### rbac-tool Installation

Choose one of the following methods:

```bash
# Option 1: kubectl plugin via krew (recommended)
kubectl krew install rbac-tool

# Option 2: Standalone installation
curl https://raw.githubusercontent.com/alcideio/rbac-tool/master/download.sh | bash
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend/kube-guard-frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## 📊 Components Overview

### Backend Components
- **RBAC Analysis Engine**: Powered by `rbac-tool` CLI
- **REST API**: FastAPI with automatic OpenAPI documentation
- **Batch Processing**: Optimized endpoints for bulk operations
- **Security Findings**: Comprehensive vulnerability detection

### Frontend Components
- **Global State Management**: Zustand-powered centralized state
- **Graph Visualization**: Interactive D3.js network graphs
- **Intelligent Caching**: Automatic data caching and deduplication
- **Performance Optimized**: Batch loading and memoization

## 🔧 Configuration & Deployment

### Local Development
```bash
# Quick start with minikube
./deploy.sh

# Access the application
kubectl port-forward -n kube-guard service/kube-guard-frontend 8080:80
```

### Production Deployment (Docker Hub)
```bash
# Deploy from published images
helm upgrade --install kube-guard ./helm/kube-guard \
  --namespace kube-guard \
  --create-namespace \
  --values ./helm/kube-guard/values.yaml \
  --wait

# Access the application
kubectl port-forward -n kube-guard service/kube-guard-frontend 8080:80
```

### Configuration Options

#### Helm Values (values.yaml)
```yaml
# Resource allocation
backend:
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "1Gi"
      cpu: "500m"

# Security settings
securityContext:
  runAsNonRoot: true
  runAsUser: 1001

# RBAC permissions (read-only)
rbac:
  rules:
    - apiGroups: [""]
      resources: ["serviceaccounts", "namespaces"]
      verbs: ["get", "list"]
    - apiGroups: ["rbac.authorization.k8s.io"]
      resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
      verbs: ["get", "list"]
```

#### Environment Variables
```bash
# Backend configuration (if running standalone)
API_PORT=8000
LOG_LEVEL=INFO
RBAC_TOOL_TIMEOUT=300

# Frontend configuration (automatically configured in Kubernetes)
REACT_APP_API_URL=http://kube-guard-backend:8000
```

### Cluster Requirements
- Kubernetes 1.19+
- RBAC enabled
- Sufficient permissions to read RBAC resources
- `rbac-tool` available in backend container (included in Docker image)

### Access Methods
1. **Port-forward** (recommended for testing): `kubectl port-forward -n kube-guard service/kube-guard-frontend 8080:80`
2. **Ingress** (optional): Enable in values.yaml for production deployments
3. **NodePort** (minikube): Set service type to NodePort if needed
## 📖 Documentation

- **[Documentation Index](./DOCUMENTATION.md)**: Comprehensive documentation guide and index
- **[Backend Documentation](./backend/README.md)**: Detailed backend setup and API reference
- **[Frontend Documentation](./frontend/README.md)**: Frontend architecture and component guide
- **[Tool Architecture](ARCHITECTURE.md)**: KubeGuard tool architecture diagrams and data flow
- **[KubeGuard Security Aspects](SECURITY.md)**: Security related information regarding KubeGuard in-cluster deployment
- **[API Documentation](http://localhost:8000/docs)**: Interactive OpenAPI documentation (when backend is running "http://localhost:8000/docs")

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [rbac-tool](https://github.com/alcideio/rbac-tool) for RBAC analysis capabilities
- [D3.js](https://d3js.org/) for graph visualization
- [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/) for the frontend
- [FastAPI](https://fastapi.tiangolo.com/) for the backend API

