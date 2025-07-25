# KubeGuard - RBAC Security Analysis Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/python-v3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)

KubeGuard is a comprehensive RBAC (Role-Based Access Control) security analysis tool for Kubernetes clusters. It provides visualization, analysis, and recommendations for improving cluster security through better RBAC configuration.

## 🎯 Features

- **Security Analysis**: Comprehensive RBAC security findings and vulnerability detection
- **Interactive Visualization**: D3.js-powered graph visualization of RBAC relationships
- **Performance Optimized**: Intelligent batch loading and caching for large datasets
- **Modern UI**: Beautiful, responsive interface built with React and TypeScript
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

## � Configuration

### Backend Configuration
Configuration is managed through environment variables:

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# RBAC Tool Configuration
RBAC_TOOL_PATH=/usr/local/bin/rbac-tool
```

### Frontend Configuration
The frontend automatically detects the backend URL and adapts to different environments.

## 📖 Documentation

- **[Documentation Index](./DOCUMENTATION.md)**: Comprehensive documentation guide and index
- **[Backend Documentation](./backend/README.md)**: Detailed backend setup and API reference
- **[Frontend Documentation](./frontend/README.md)**: Frontend architecture and component guide
- **[API Documentation](http://localhost:8000/docs)**: Interactive OpenAPI documentation (when backend is running)
- **[Changelog](./CHANGELOG.md)**: Version history and release notes

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for detailed information on:

- **Development setup** and local environment
- **Code style** and documentation standards  
- **Pull request process** and review guidelines
- **Testing requirements** and best practices

Quick contribution steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Update documentation as needed
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [rbac-tool](https://github.com/alcideio/rbac-tool) for RBAC analysis capabilities
- [D3.js](https://d3js.org/) for graph visualization
- [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/) for the frontend
- [FastAPI](https://fastapi.tiangolo.com/) for the backend API

## 📧 Support

For questions, issues, or contributions, please open an issue on GitHub or contact the development team.

---

**Made with ❤️ for the Kubernetes security community**
