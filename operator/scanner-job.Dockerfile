FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl ca-certificates gnupg && \
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash && \
    curl -L -o /usr/local/bin/kube-linter https://github.com/stackrox/kube-linter/releases/download/v0.6.6/kube-linter-linux && \
    chmod +x /usr/local/bin/kube-linter && \
    pip install --no-cache-dir pyyaml kubernetes && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY scanner.py .

ENTRYPOINT ["python", "scanner.py"]
