# Deploy Video Management Service to Kubernetes
# This script provides a guided deployment experience for Windows users
param (
    [string]$registry = "streamflix",
    [string]$tag = "latest",
    [string]$namespace = "default",
    [string]$mode = "helm", # Options: kubectl, helm
    [string]$action = "deploy"  # Options: deploy, delete, status
)

function Show-Banner {
    Write-Host ""
    Write-Host "Streamflix Video Management Service - Kubernetes Deployment" -ForegroundColor Cyan
    Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
    Write-Host ""
}

function Get-KubernetesContext {
    $context = kubectl config current-context
    Write-Host "Current Kubernetes context: " -NoNewline
    Write-Host $context -ForegroundColor Green
    
    $continue = Read-Host "Continue with this context? (Y/n)"
    if ($continue -eq "n") {
        exit
    }
}

function Deploy-WithKubectl {
    Write-Host "Deploying with kubectl..." -ForegroundColor Yellow
    
    # Replace variables in deployment.yaml
    Write-Host "Setting image to $registry/video-mgmt:$tag..."
    $deploymentYaml = Get-Content -Path ".\k8s\deployment.yaml"
    $deploymentYaml = $deploymentYaml -replace '\$\{DOCKER_REGISTRY\}', $registry
    $deploymentYaml = $deploymentYaml -replace '\$\{VERSION\}', $tag
    $deploymentYaml | Set-Content -Path ".\k8s\deployment.yaml.temp"
    
    # Apply manifests
    try {
        Write-Host "Applying ConfigMap..."
        kubectl apply -f ".\k8s\configmap.yaml" -n $namespace
        
        Write-Host "Applying Secrets..."
        kubectl apply -f ".\k8s\secrets.yaml" -n $namespace
        
        Write-Host "Applying Deployment..."
        kubectl apply -f ".\k8s\deployment.yaml.temp" -n $namespace
        
        Write-Host "Applying Service..."
        kubectl apply -f ".\k8s\service.yaml" -n $namespace
        
        Write-Host "Applying HPA..."
        kubectl apply -f ".\k8s\hpa.yaml" -n $namespace
        
        Write-Host "Applying Ingress..."
        kubectl apply -f ".\k8s\ingress.yaml" -n $namespace
        
        Write-Host "Deployment completed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "Error during deployment: $_" -ForegroundColor Red
    }
    finally {
        # Clean up temp file
        if (Test-Path ".\k8s\deployment.yaml.temp") {
            Remove-Item ".\k8s\deployment.yaml.temp"
        }
    }
}

function Delete-WithKubectl {
    Write-Host "Deleting with kubectl..." -ForegroundColor Yellow
    
    try {
        kubectl delete -f ".\k8s\ingress.yaml" -n $namespace --ignore-not-found
        kubectl delete -f ".\k8s\hpa.yaml" -n $namespace --ignore-not-found
        kubectl delete -f ".\k8s\service.yaml" -n $namespace --ignore-not-found
        kubectl delete -f ".\k8s\deployment.yaml" -n $namespace --ignore-not-found
        kubectl delete -f ".\k8s\configmap.yaml" -n $namespace --ignore-not-found
        kubectl delete -f ".\k8s\secrets.yaml" -n $namespace --ignore-not-found
        
        Write-Host "Deletion completed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "Error during deletion: $_" -ForegroundColor Red
    }
}

function Deploy-WithHelm {
    Write-Host "Deploying with Helm..." -ForegroundColor Yellow
    
    # Update dependencies
    Write-Host "Updating Helm dependencies..."
    helm dependency update ".\helm\video-mgmt\"
    
    # Deploy with Helm
    try {
        Write-Host "Installing Helm chart..."
        helm upgrade --install video-mgmt ".\helm\video-mgmt\" `
            --namespace $namespace `
            --create-namespace `
            --set image.repository="$registry/video-mgmt" `
            --set image.tag="$tag"
            
        Write-Host "Helm deployment completed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "Error during Helm deployment: $_" -ForegroundColor Red
    }
}

function Delete-WithHelm {
    Write-Host "Deleting with Helm..." -ForegroundColor Yellow
    
    try {
        helm uninstall video-mgmt --namespace $namespace
        Write-Host "Helm release deleted successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "Error during Helm deletion: $_" -ForegroundColor Red
    }
}

function Show-Status {
    Write-Host "Current Status:" -ForegroundColor Yellow
    
    Write-Host "`nDeployments:"
    kubectl get deployments -l app=video-management-service -n $namespace
    
    Write-Host "`nPods:"
    kubectl get pods -l app=video-management-service -n $namespace
    
    Write-Host "`nServices:"
    kubectl get svc -l app=video-management-service -n $namespace
    
    Write-Host "`nHPA:"
    kubectl get hpa -l app=video-management-service -n $namespace
    
    Write-Host "`nIngress:"
    kubectl get ingress -l app=video-management-service -n $namespace
}

# Main execution
Show-Banner
Get-KubernetesContext

if ($action -eq "deploy") {
    if ($mode -eq "kubectl") {
        Deploy-WithKubectl
    }
    else {
        Deploy-WithHelm
    }
}
elseif ($action -eq "delete") {
    if ($mode -eq "kubectl") {
        Delete-WithKubectl
    }
    else {
        Delete-WithHelm
    }
}
elseif ($action -eq "status") {
    Show-Status
}
else {
    Write-Host "Invalid action specified. Use 'deploy', 'delete', or 'status'." -ForegroundColor Red
}
