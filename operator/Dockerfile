FROM python:3.11-slim

WORKDIR /app

COPY controller.py .
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Opcional: crear usuario no-root
RUN useradd -m -g users operator
USER operator

ENTRYPOINT ["kopf", "run", "--standalone", "--verbose", "--namespace=kube-guard", "controller.py"]
