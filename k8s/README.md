# ☸️ Kubernetes & Minikube Deployment Guide

This directory contains the production Kubernetes manifests to deploy CineScope into a Minikube or standard Kubernetes cluster.

---

## 📦 Architecture in Kubernetes

- **Namespace**: `cinescope`
- **Database**: MySQL 8.0 Deployment + PVC (PersistentVolumeClaim) + headless ClusterIP Service
- **Backend**: NestJS GraphQL Deployment (2 replicas) with liveness & readiness probes (`/health`) and Prometheus metrics scraping annotations + ClusterIP Service
- **Frontend**: Next.js Web App Deployment (2 replicas) + NodePort Service (Port `30080`)
- **Ingress**: Ingress controller routing `/graphql`, `/metrics`, and `/health` to backend and root `/` to frontend.

---

## 🚀 Minikube Quick Start

### 1. Start Minikube & Enable Ingress
```bash
minikube start
minikube addons enable ingress
```

### 2. Point Docker CLI to Minikube's Docker Daemon
```bash
# On Windows PowerShell:
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# On macOS/Linux:
eval $(minikube docker-env)
```

### 3. Build Docker Images Inside Minikube
```bash
# Build backend image
docker build -t cinescope-backend:latest ./backend

# Build frontend image
docker build -t cinescope-frontend:latest ./frontend
```

### 4. Deploy Manifests
```bash
kubectl apply -k ./k8s
```

### 5. Verify Pods & Services
```bash
kubectl get pods -n cinescope
kubectl get svc -n cinescope
```

### 6. Access Application
```bash
# In Minikube, forward the frontend service or use minikube service:
minikube service frontend-service -n cinescope
```
Or use NodePort directly:
```text
http://<minikube-ip>:30080
```
