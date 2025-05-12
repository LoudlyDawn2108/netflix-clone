# Makefile for Video Management Service Kubernetes operations

# Variables
REGISTRY ?= streamflix
IMAGE_NAME ?= video-mgmt
TAG ?= latest
NAMESPACE ?= default
KUBE_CONTEXT ?= $(shell kubectl config current-context)
HELM_RELEASE = video-mgmt
HELM_CHART_DIR = ./helm/video-mgmt
VALUES_FILE ?= ./helm/video-mgmt/values.yaml

# Docker build and push
.PHONY: docker-build
docker-build:
	docker build -f Dockerfile.production -t $(REGISTRY)/$(IMAGE_NAME):$(TAG) .

.PHONY: docker-push
docker-push: docker-build
	docker push $(REGISTRY)/$(IMAGE_NAME):$(TAG)

# Kubernetes raw manifest deployment
.PHONY: k8s-deploy
k8s-deploy:
	@echo "Deploying using kubectl..."
	@sed -i 's|\$${DOCKER_REGISTRY}|$(REGISTRY)|g' ./k8s/deployment.yaml
	@sed -i 's|\$${VERSION}|$(TAG)|g' ./k8s/deployment.yaml
	kubectl apply -f ./k8s/configmap.yaml -n $(NAMESPACE)
	kubectl apply -f ./k8s/secrets.yaml -n $(NAMESPACE)
	kubectl apply -f ./k8s/deployment.yaml -n $(NAMESPACE)
	kubectl apply -f ./k8s/service.yaml -n $(NAMESPACE)
	kubectl apply -f ./k8s/hpa.yaml -n $(NAMESPACE)
	kubectl apply -f ./k8s/ingress.yaml -n $(NAMESPACE)

.PHONY: k8s-delete
k8s-delete:
	kubectl delete -f ./k8s/ingress.yaml -n $(NAMESPACE) --ignore-not-found
	kubectl delete -f ./k8s/hpa.yaml -n $(NAMESPACE) --ignore-not-found
	kubectl delete -f ./k8s/service.yaml -n $(NAMESPACE) --ignore-not-found
	kubectl delete -f ./k8s/deployment.yaml -n $(NAMESPACE) --ignore-not-found
	kubectl delete -f ./k8s/configmap.yaml -n $(NAMESPACE) --ignore-not-found
	kubectl delete -f ./k8s/secrets.yaml -n $(NAMESPACE) --ignore-not-found

# Helm deployment
.PHONY: helm-deps
helm-deps:
	helm dependency update $(HELM_CHART_DIR)

.PHONY: helm-install
helm-install: helm-deps
	helm install $(HELM_RELEASE) $(HELM_CHART_DIR) \
		--namespace=$(NAMESPACE) \
		--create-namespace \
		--values $(VALUES_FILE) \
		--set image.repository=$(REGISTRY)/$(IMAGE_NAME) \
		--set image.tag=$(TAG)

.PHONY: helm-upgrade
helm-upgrade: helm-deps
	helm upgrade $(HELM_RELEASE) $(HELM_CHART_DIR) \
		--namespace=$(NAMESPACE) \
		--values $(VALUES_FILE) \
		--set image.repository=$(REGISTRY)/$(IMAGE_NAME) \
		--set image.tag=$(TAG)

.PHONY: helm-delete
helm-delete:
	helm uninstall $(HELM_RELEASE) --namespace=$(NAMESPACE)

.PHONY: helm-template
helm-template: helm-deps
	helm template $(HELM_RELEASE) $(HELM_CHART_DIR) \
		--values $(VALUES_FILE) \
		--set image.repository=$(REGISTRY)/$(IMAGE_NAME) \
		--set image.tag=$(TAG)

# Helpers
.PHONY: port-forward
port-forward:
	kubectl port-forward svc/video-management-service 8080:8080 -n $(NAMESPACE)

.PHONY: logs
logs:
	kubectl logs -l app=video-management-service -n $(NAMESPACE) -f

.PHONY: status
status:
	@echo "=== Deployments ==="
	kubectl get deployments -l app=video-management-service -n $(NAMESPACE)
	@echo "=== Pods ==="
	kubectl get pods -l app=video-management-service -n $(NAMESPACE)
	@echo "=== Services ==="
	kubectl get svc -l app=video-management-service -n $(NAMESPACE)
	@echo "=== HPA ==="
	kubectl get hpa -l app=video-management-service -n $(NAMESPACE)
	@echo "=== Ingress ==="
	kubectl get ingress -l app=video-management-service -n $(NAMESPACE)

.PHONY: help
help:
	@echo "Video Management Service Kubernetes Operations"
	@echo ""
	@echo "Usage:"
	@echo "  make docker-build                 Build the Docker image"
	@echo "  make docker-push                  Build and push Docker image"
	@echo "  make k8s-deploy                   Deploy using kubectl"
	@echo "  make k8s-delete                   Delete kubectl deployment"
	@echo "  make helm-install                 Install using Helm"
	@echo "  make helm-upgrade                 Upgrade Helm release"
	@echo "  make helm-delete                  Delete Helm release"
	@echo "  make helm-template                Render Helm templates locally"
	@echo "  make port-forward                 Forward local port to service"
	@echo "  make logs                         View logs"
	@echo "  make status                       Check deployment status"
	@echo ""
	@echo "Variables:"
	@echo "  REGISTRY                          Docker registry (default: streamflix)"
	@echo "  IMAGE_NAME                        Image name (default: video-mgmt)"
	@echo "  TAG                               Image tag (default: latest)"
	@echo "  NAMESPACE                         Kubernetes namespace (default: default)"
	@echo "  HELM_RELEASE                      Helm release name (default: video-mgmt)"
	@echo "  VALUES_FILE                       Helm values file (default: ./helm/video-mgmt/values.yaml)"
