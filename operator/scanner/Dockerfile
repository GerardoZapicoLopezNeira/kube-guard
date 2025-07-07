FROM python:3.12-slim

# Evitar problemas de encoding y buffering
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Instalar herramientas necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl unzip ca-certificates bash gcc \
    && rm -rf /var/lib/apt/lists/*

# Instalar Trivy
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Instalar Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Crear directorio de trabajo
WORKDIR /app

# Copiar dependencias Python
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copiar el script scanner
COPY scanner.py .

# Ejecutar script principal
ENTRYPOINT ["python3", "scanner.py"]
