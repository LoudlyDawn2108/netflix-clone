# Kubernetes Deployment Guide

This document provides instructions for deploying the Video Management Service to Kubernetes using either the raw Kubernetes manifests or Helm charts.

## Option 1: Deploying with kubectl and Kubernetes Manifests

The `k8s/` folder contains all the necessary Kubernetes manifest files for deploying the Video Management Service.

### Prerequisites

-   Kubernetes cluster v1.19+
-   `kubectl` CLI installed and configured to connect to your cluster
-   Access to a container registry with the Video Management Service image

### Deployment Steps

1. **Set up environment variables**

    Before deploying, you need to configure your deployment-specific values:

    ```powershell
    # Set these variables according to your environment
    $DOCKER_REGISTRY = "your-registry"
    $VERSION = "1.0.0"

    # Replace variables in deployment.yaml
    (Get-Content -Path .\k8s\deployment.yaml) -replace '\$\{DOCKER_REGISTRY\}', $DOCKER_REGISTRY -replace '\$\{VERSION\}', $VERSION | Set-Content -Path .\k8s\deployment.yaml
    ```

2. **Create secrets**

    First, deploy the secrets (replace placeholder values with your actual secrets):

    ```powershell
    kubectl apply -f k8s/secrets.yaml
    ```

3. **Apply ConfigMap**

    ```powershell
    kubectl apply -f k8s/configmap.yaml
    ```

4. **Deploy application**

    ```powershell
    kubectl apply -f k8s/deployment.yaml
    kubectl apply -f k8s/service.yaml
    kubectl apply -f k8s/ingress.yaml
    ```

5. **Enable autoscaling**

    ```powershell
    kubectl apply -f k8s/hpa.yaml
    ```

6. **Verify deployment**

    ```powershell
    kubectl get deployments
    kubectl get pods
    kubectl get svc
    kubectl get ingress
    kubectl get hpa
    ```

## Option 2: Deploying with Helm Chart

The Helm chart in `helm/video-mgmt/` provides a more configurable and maintainable deployment method.

### Prerequisites

-   Kubernetes cluster v1.19+
-   Helm v3.2.0+
-   Access to a container registry with the Video Management Service image

### Deployment Steps

1. **Update dependencies**

    ```powershell
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm dependency update .\helm\video-mgmt\
    ```

2. **Create a custom values file (optional)**

    Create a custom values file to override default settings:

    ```powershell
    Copy-Item .\helm\video-mgmt\values.yaml .\helm\video-mgmt\values-prod.yaml
    ```

    Edit `values-prod.yaml` to customize your deployment settings:

    - Update image repository and tag
    - Configure ingress host names and TLS settings
    - Set resource limits and requests
    - Configure autoscaling parameters

3. **Install the chart**

    ```powershell
    helm install video-mgmt .\helm\video-mgmt\ -f .\helm\video-mgmt\values-prod.yaml
    ```

    Or use the default values:

    ```powershell
    helm install video-mgmt .\helm\video-mgmt\
    ```

4. **Verify deployment**

    ```powershell
    helm list
    kubectl get deployments
    kubectl get pods
    ```

5. **Upgrade deployment**

    When you need to update the deployment:

    ```powershell
    # Update your custom values first
    helm upgrade video-mgmt .\helm\video-mgmt\ -f .\helm\video-mgmt\values-prod.yaml
    ```

6. **Rollback if needed**

    ```powershell
    helm rollback video-mgmt
    ```

## Common Operations

### Scaling the deployment manually

```powershell
kubectl scale deployment video-management-service --replicas=5
```

### Checking logs

```powershell
kubectl logs -l app=video-management-service
```

### Accessing the service

For development/testing, you can port-forward to access the service locally:

```powershell
kubectl port-forward svc/video-management-service 8080:8080
```

Then access the service at http://localhost:8080/api/v1/videos

### Checking service health

```powershell
kubectl port-forward svc/video-management-service 8080:8080
curl http://localhost:8080/actuator/health
```

## Troubleshooting

1. **Pods not starting**:

    - Check pod events: `kubectl describe pod <pod-name>`
    - Check logs: `kubectl logs <pod-name>`
    - Verify secrets and configmaps are properly created

2. **Service not accessible**:

    - Verify service endpoints: `kubectl get endpoints video-management-service`
    - Check if pods are ready: `kubectl get pods -l app=video-management-service`

3. **Database connection issues**:

    - Verify database secrets are correctly configured
    - Check that database is accessible from the pod
    - Examine pod logs for connection errors

4. **Resource limits**:
    - Check if pods are hitting resource limits: `kubectl describe pod <pod-name>`
    - Monitor resource usage: `kubectl top pods`
