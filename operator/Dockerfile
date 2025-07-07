FROM python:3.11-slim

WORKDIR /app

COPY kube-guard-controller.py .
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN useradd -m -g users operator
USER operator

ENTRYPOINT ["kopf", "run", "--standalone", "--verbose", "--namespace=kube-guard", "controller.py"]
