# Security Architecture

## Overview

KubeGuard implements a tool to analyze RBAC permissions in Kubernetes clusters with minimal privileges.

## Authentication & Authorization

### ServiceAccount-Based Authentication
- **In-cluster authentication**: Uses Kubernetes ServiceAccount tokens
- **No external credentials**: Eliminates credential management overhead
- **Automatic token rotation**: Leverages Kubernetes native token lifecycle

### RBAC Permissions
```yaml
# Minimal required permissions
rules:
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "clusterroles", "rolebindings", "clusterrolebindings"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["serviceaccounts", "namespaces"]
  verbs: ["get", "list"]
```

**Key principles:**
- **Read-only access**: No modification capabilities
- **Scoped permissions**: Limited to RBAC resources only
- **Principle of least privilege**: Minimal required access

## Network Security

### Internal Communication
- **Service mesh ready**: Compatible with Istio/Linkerd
- **Internal DNS**: Uses Kubernetes service discovery
- **No external dependencies**: Self-contained analysis

### Ingress Security
- **Optional ingress**: No external exposure by default
- **TLS termination**: HTTPS support when ingress is enabled
- **Network policies**: Configurable traffic restrictions

## Container Security

### Image Security
- **Minimal base images**: Python 3.11-slim, nginx:alpine
- **Non-root execution**: Dedicated user accounts
- **No privileged containers**: Standard security context

### Runtime Security
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
```

## Data Security

### Data Processing
- **In-memory only**: No persistent storage of cluster data
- **Stateless design**: No sensitive data retention
- **Real-time analysis**: Fresh data on each request

### Communication Security
- **Internal encryption**: TLS for internal services
- **API authentication**: JWT tokens for frontend-backend communication
- **CORS protection**: Configured allowed origins

## Threat Model

### Addressed Threats
1. **Credential exposure**: Eliminated through ServiceAccount usage
2. **Data exfiltration**: Read-only permissions prevent data modification
3. **Privilege escalation**: Minimal RBAC permissions
4. **Network attacks**: Internal-only communication

### Security Boundaries
- **Namespace isolation**: Deployed in dedicated namespace
- **Network segmentation**: Optional network policies
- **Resource limits**: Configured CPU/memory constraints

## Compliance & Standards

### Security Standards
- **CIS Kubernetes Benchmark**: Follows container security guidelines
- **NIST Cybersecurity Framework**: Implements identify and protect functions
- **OWASP**: Addresses web application security concerns

### Audit Capabilities
- **Comprehensive logging**: All RBAC analysis activities logged
- **Kubernetes audit**: Integrates with cluster audit logs
- **Prometheus metrics**: Security-relevant metrics exposed

## Security Monitoring

### Health Checks
- **Liveness probes**: Automatic restart on failure
- **Readiness probes**: Traffic routing only when ready
- **Startup probes**: Graceful application initialization
