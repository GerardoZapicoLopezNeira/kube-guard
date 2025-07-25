#!/bin/bash

# KubeGuard Deployment Script for TFM
# Author: Gerardo Zapico
# Description: Production-ready deployment script for minikube environments

set -euo pipefail

# Configuration
NAMESPACE="kube-guard"
IMAGE_TAG=${IMAGE_TAG:-"latest"}
CHART_PATH="./helm/kube-guard"
TIMEOUT=${TIMEOUT:-"300s"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Enhanced prerequisites check
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    command -v minikube >/dev/null 2>&1 || missing_tools+=("minikube")
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v helm >/dev/null 2>&1 || missing_tools+=("helm")
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install the missing tools and try again"
        exit 1
    fi
    
    # Check minikube status
    if ! minikube status >/dev/null 2>&1; then
        log_error "Minikube is not running. Start it with: minikube start"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check Helm chart exists
    if [ ! -d "$CHART_PATH" ]; then
        log_error "Helm chart not found at $CHART_PATH"
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

# Build images optimized for minikube
build_images() {
    log_info "Building Docker images for minikube..."
    
    # Configure Docker to use minikube's Docker daemon
    eval $(minikube docker-env)
    
    # Build backend image
    log_info "Building backend image..."
    if docker build -t "kube-guard-backend:${IMAGE_TAG}" ./backend/; then
        log_success "Backend image built successfully"
    else
        log_error "Failed to build backend image"
        exit 1
    fi
    
    # Build frontend image
    log_info "Building frontend image..."
    if docker build -t "kube-guard-frontend:${IMAGE_TAG}" ./frontend/kube-guard-frontend/; then
        log_success "Frontend image built successfully"
    else
        log_error "Failed to build frontend image"
        exit 1
    fi
    
    log_success "All images built successfully"
}

# Enhanced deployment with validation
deploy() {
    log_info "Deploying KubeGuard to Kubernetes..."
    
    # Create namespace if it doesn't exist
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" name="$NAMESPACE"
        log_success "Namespace '$NAMESPACE' created"
    else
        log_warning "Namespace '$NAMESPACE' already exists"
    fi
    
    # Use values-simple.yaml if it exists, otherwise use default values
    local values_args=""
    if [ -f "$CHART_PATH/values-simple.yaml" ]; then
        values_args="--values $CHART_PATH/values-simple.yaml"
        log_info "Using values-simple.yaml configuration"
    else
        log_info "Using default values.yaml configuration"
    fi
    
    # Deploy with Helm
    log_info "Installing/upgrading Helm chart..."
    if helm upgrade --install kube-guard "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        $values_args \
        --set image.tag="$IMAGE_TAG" \
        --set image.pullPolicy=Never \
        --timeout="$TIMEOUT" \
        --wait; then
        log_success "KubeGuard deployed successfully"
    else
        log_error "Failed to deploy KubeGuard"
        exit 1
    fi
}

# Comprehensive deployment verification
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait for pods to be ready
    log_info "Waiting for backend pods to be ready..."
    if kubectl wait --for=condition=ready pod -l app=kube-guard-backend -n "$NAMESPACE" --timeout="$TIMEOUT"; then
        log_success "Backend pods are ready"
    else
        log_error "Backend pods failed to become ready"
        return 1
    fi
    
    log_info "Waiting for frontend pods to be ready..."
    if kubectl wait --for=condition=ready pod -l app=kube-guard-frontend -n "$NAMESPACE" --timeout="$TIMEOUT"; then
        log_success "Frontend pods are ready"
    else
        log_error "Frontend pods failed to become ready"
        return 1
    fi
    
    # Test backend health
    log_info "Testing backend health..."
    local backend_pod=$(kubectl get pods -n "$NAMESPACE" -l app=kube-guard-backend -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n "$NAMESPACE" "$backend_pod" -- curl -f http://localhost:8000/health >/dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed (may take time to start)"
    fi
    
    # Display deployment info
    echo
    log_info "Deployment Summary:"
    kubectl get pods,services -n "$NAMESPACE"
    
    echo
    log_success "KubeGuard is ready!"
    log_info "Access the application with: kubectl port-forward -n $NAMESPACE service/kube-guard-frontend 8080:80"
    log_info "Then open: http://localhost:8080"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up deployment..."
    helm uninstall kube-guard -n "$NAMESPACE" 2>/dev/null || true
    kubectl delete namespace "$NAMESPACE" 2>/dev/null || true
    log_success "Cleanup completed"
}

# Main execution
main() {
    echo "KubeGuard Deployment Script"
    echo "================================"
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            build_images
            deploy
            verify_deployment
            ;;
        "cleanup")
            cleanup
            ;;
        "verify")
            verify_deployment
            ;;
        *)
            echo "Usage: $0 [deploy|cleanup|verify]"
            echo "  deploy  - Full deployment (default)"
            echo "  cleanup - Remove KubeGuard from cluster"
            echo "  verify  - Verify existing deployment"
            exit 1
            ;;
    esac
}

main "$@"