# Production Dockerfile for KubeGuard Backend
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/

# Install rbac-tool using official installer
RUN curl https://raw.githubusercontent.com/alcideio/rbac-tool/master/download.sh | bash \
    && mv ./bin/rbac-tool /usr/local/bin/ \
    && chmod +x /usr/local/bin/rbac-tool

# Set working directory
WORKDIR /app

# Install Python dependencies globally
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Verify uvicorn installation
RUN uvicorn --version

# Production stage
FROM python:3.11-slim

# Create non-root user
RUN groupadd -r kube-guard && useradd -r -g kube-guard -d /app -s /bin/bash kube-guard

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy kubectl and rbac-tool from builder
COPY --from=builder /usr/local/bin/kubectl /usr/local/bin/kubectl
COPY --from=builder /usr/local/bin/rbac-tool /usr/local/bin/rbac-tool

# Copy Python packages from builder (global installation)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Set working directory
WORKDIR /app

# Copy application code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/logs \
    && chown -R kube-guard:kube-guard /app

# Switch to non-root user
USER kube-guard

# Verify uvicorn is available
RUN uvicorn --version

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
