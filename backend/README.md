# KubeGuard Backend - RBAC Analysis API

The KubeGuard backend is a FastAPI-powered REST API that provides comprehensive RBAC security analysis for Kubernetes clusters. It leverages the `rbac-tool` CLI to extract and analyze RBAC configurations, offering optimized endpoints for batch operations and real-time security insights.

## 🏗️ Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── api/
│   │   └── rbac.py         # RBAC API endpoints
│   ├── core/
│   │   └── config.py       # Configuration and settings
│   ├── models/
│   │   └── rbac.py         # Pydantic data models
│   └── services/
│       └── rbac_service.py # Business logic and rbac-tool integration
└── requirements.txt         # Python dependencies
```

## 🚀 Setup and Installation

### Prerequisites

- Python 3.8+
- `kubectl` configured and connected to a Kubernetes cluster
- `rbac-tool` installed ([Installation Guide](https://github.com/alcideio/rbac-tool))

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd kube-guard/backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Install rbac-tool** (choose one method):
   
   **Option A: Using kubectl krew plugin manager (Recommended)**:
   ```bash
   # Install krew if not already installed
   kubectl krew install rbac-tool
   
   # Verify installation
   kubectl rbac-tool --help
   ```
   
   **Option B: Standalone installation**:
   ```bash
   # Quick install script
   curl https://raw.githubusercontent.com/alcideio/rbac-tool/master/download.sh | bash
   
   # Or manual download
   # macOS
   brew install alcideio/tap/rbac-tool
   
   # Linux (specific version)
   curl -o rbac-tool https://github.com/alcideio/rbac-tool/releases/download/v1.13.0/rbac-tool_v1.13.0_linux_amd64
   chmod +x rbac-tool
   sudo mv rbac-tool /usr/local/bin/
   ```

5. **Verify rbac-tool installation**:
   ```bash
   # For krew installation
   kubectl rbac-tool --help
   
   # For standalone installation  
   rbac-tool --help
   ```
   
   **Note**: The backend is configured to use `kubectl rbac-tool` (krew plugin format). If you installed the standalone version, you may need to create a symlink or alias.

6. **Run the development server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at `http://localhost:8000` with interactive documentation at `http://localhost:8000/docs`.

## 📡 API Endpoints

### Security Analysis
- `GET /rbac/analysis` - Get comprehensive RBAC security findings
- `GET /rbac/bindings` - List all RBAC bindings in the cluster

### Policy Rules
- `GET /rbac/policy-rules` - Get policy rules for a specific subject
- `GET /rbac/policy-rules/batch` - **Optimized**: Get policy rules for multiple subjects
- `POST /rbac/policy-rules/batch` - **Fallback**: Handle large subject lists via POST body

### Permission Queries
- `GET /rbac/who-can` - Find subjects who can perform specific actions
- `GET /rbac/roles` - Get rules for specific roles or cluster roles

### Key Features

#### 🚀 Batch Processing Optimization
The backend implements intelligent batch processing for policy rules:

```python
# Automatic GET/POST selection based on URL length
@router.get("/policy-rules/batch")
def get_batch_policy_rules(subjects: List[str] = Query(...)):
    """Optimized batch endpoint with URL length detection"""
    # Handles multiple subjects in a single request
    # Reduces API calls from N to 1
```

#### 🛡️ Error Handling
Comprehensive error handling ensures graceful degradation:

```python
# Individual subject failures don't break entire batch
for subject in subjects:
    try:
        rules = fetch_rbac_policy_rules(subject=subject)
        results[subject] = rules
    except Exception as e:
        results[subject] = []  # Continue with empty results
```

#### 📊 Data Models
Type-safe data models using Pydantic:

```python
class RbacFinding(BaseModel):
    """Security finding with severity and recommendations"""
    Subject: RbacSubject
    Finding: FindingDetails
    
class RbacPolicyRule(BaseModel):
    """Policy rule with permissions and origins"""
    subject: str
    verbs: List[str]
    resources: List[str]
```

## 🔧 Configuration

Configuration is managed through environment variables:

```bash
# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# RBAC Tool Configuration (Optional)
# Note: Backend uses 'kubectl rbac-tool' by default (krew plugin)
# Override only if using standalone installation
RBAC_TOOL_PATH=rbac-tool  # or /usr/local/bin/rbac-tool for standalone
RBAC_TOOL_TIMEOUT=30

# Kubernetes Configuration
KUBECONFIG=~/.kube/config
```

### RBAC Tool Configuration Notes

The backend is designed to work with `kubectl rbac-tool` (installed via krew). If you're using the standalone version, you have two options:

1. **Create a wrapper script** (recommended):
   ```bash
   # Create /usr/local/bin/kubectl-rbac-tool
   #!/bin/bash
   /usr/local/bin/rbac-tool "$@"
   chmod +x /usr/local/bin/kubectl-rbac-tool
   ```

2. **Use environment variable**:
   ```bash
   export RBAC_TOOL_PATH="rbac-tool"
   # Then modify service calls to use the path directly
   ```

## 🧪 Development

### Code Structure

- **`app/main.py`**: FastAPI application setup and middleware
- **`app/api/rbac.py`**: REST API endpoints with comprehensive documentation
- **`app/services/rbac_service.py`**: Business logic and rbac-tool integration
- **`app/models/rbac.py`**: Pydantic models for type safety
- **`app/core/config.py`**: Configuration management

### Adding New Endpoints

1. Define data models in `models/rbac.py`
2. Implement business logic in `services/rbac_service.py`
3. Create API endpoints in `api/rbac.py`
4. Add comprehensive docstrings following the established pattern

### Code Quality

The codebase follows these standards:
- **Type annotations**: Full TypeScript-style type hints
- **Documentation**: Comprehensive docstrings in English
- **Error handling**: Graceful error handling with meaningful messages
- **Performance**: Optimized for large-scale cluster analysis

## 🚀 Performance Optimizations

### Batch Processing
- **Multiple subjects**: Process multiple policy rule requests in a single API call
- **Intelligent routing**: Automatic GET/POST selection based on URL length
- **Error isolation**: Individual failures don't break entire batches

### Caching Strategy
- **Frontend caching**: Intelligent caching in the frontend store
- **Duplicate prevention**: Automatic deduplication of API requests
- **Memory efficiency**: Streaming processing for large datasets

## 🐛 Troubleshooting

### Common Issues

1. **rbac-tool not found**:
   ```bash
   # Check if installed as kubectl plugin
   kubectl rbac-tool --help
   
   # Check standalone installation
   which rbac-tool
   
   # If not found, install using the installation steps above
   ```

2. **"kubectl rbac-tool" command not found**:
   ```bash
   # Check krew installation
   kubectl krew list | grep rbac-tool
   
   # If not installed via krew, create wrapper:
   echo '#!/bin/bash' > /usr/local/bin/kubectl-rbac-tool
   echo '/usr/local/bin/rbac-tool "$@"' >> /usr/local/bin/kubectl-rbac-tool
   chmod +x /usr/local/bin/kubectl-rbac-tool
   ```

3. **kubectl connection issues**:
   ```bash
   kubectl cluster-info
   # Verify cluster connection
   ```

4. **Permission errors**:
   ```bash
   kubectl auth can-i list clusterroles
   # Verify sufficient permissions for RBAC analysis
   ```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=True
uvicorn app.main:app --reload --log-level debug
```

## 📚 API Documentation

When the server is running, comprehensive API documentation is available at:
- **Interactive Docs**: `http://localhost:8000/docs` (Swagger UI)
- **ReDoc**: `http://localhost:8000/redoc` (Alternative documentation)
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

## 🤝 Contributing

1. Follow the established code patterns and documentation style
2. Add type annotations for all functions and methods
3. Include comprehensive docstrings with examples
4. Test endpoints with various cluster configurations
5. Update documentation for any API changes

---

For frontend integration details, see the [Frontend README](../frontend/README.md).
