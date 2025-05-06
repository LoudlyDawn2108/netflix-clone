output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.streamflix_auth.repository_url
}

# Conditionally output cluster details based on the environment
output "eks_cluster_id" {
  description = "The ID of the EKS cluster"
  value = var.environment == "dev" ? (
    length(module.eks_dev) > 0 ? module.eks_dev[0].cluster_id : null
  ) : var.environment == "staging" ? (
    length(module.eks_staging) > 0 ? module.eks_staging[0].cluster_id : null
  ) : var.environment == "prod" ? (
    length(module.eks_prod) > 0 ? module.eks_prod[0].cluster_id : null
  ) : null
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster API server"
  value = var.environment == "dev" ? (
    length(module.eks_dev) > 0 ? module.eks_dev[0].cluster_endpoint : null
  ) : var.environment == "staging" ? (
    length(module.eks_staging) > 0 ? module.eks_staging[0].cluster_endpoint : null
  ) : var.environment == "prod" ? (
    length(module.eks_prod) > 0 ? module.eks_prod[0].cluster_endpoint : null
  ) : null
}

output "kubeconfig_command" {
  description = "Command to configure kubectl for this cluster"
  value = "aws eks update-kubeconfig --name ${var.environment == "dev" ? (
    length(module.eks_dev) > 0 ? module.eks_dev[0].cluster_id : null
  ) : var.environment == "staging" ? (
    length(module.eks_staging) > 0 ? module.eks_staging[0].cluster_id : null
  ) : var.environment == "prod" ? (
    length(module.eks_prod) > 0 ? module.eks_prod[0].cluster_id : null
  ) : "cluster-not-created"} --region ${var.aws_region}"
}