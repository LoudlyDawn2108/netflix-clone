provider "aws" {
  region = var.aws_region
}

# VPC for our Kubernetes cluster
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "streamflix-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway     = true
  enable_vpn_gateway     = false
  single_nat_gateway     = var.environment != "prod"
  one_nat_gateway_per_az = var.environment == "prod"
  
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  # Tags required for EKS
  private_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb"             = "1"
  }

  public_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                      = "1"
  }

  tags = local.common_tags
}

# Create dev environment EKS cluster
module "eks_dev" {
  source = "./modules/eks"
  count  = var.environment == "dev" ? 1 : 0

  cluster_name    = local.cluster_name
  cluster_version = var.kubernetes_version
  environment     = "dev"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  tags = local.common_tags
}

# Create staging environment EKS cluster
module "eks_staging" {
  source = "./modules/eks"
  count  = var.environment == "staging" ? 1 : 0

  cluster_name    = local.cluster_name
  cluster_version = var.kubernetes_version
  environment     = "staging"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  tags = local.common_tags
}

# Create production environment EKS cluster
module "eks_prod" {
  source = "./modules/eks"
  count  = var.environment == "prod" ? 1 : 0

  cluster_name    = local.cluster_name
  cluster_version = var.kubernetes_version
  environment     = "prod"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  tags = local.common_tags
}

# Create AWS ECR repository for storing our container images
resource "aws_ecr_repository" "streamflix_auth" {
  name                 = "streamflix-auth"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = local.common_tags
}

# Create lifecycle policy for ECR
resource "aws_ecr_lifecycle_policy" "streamflix_auth" {
  repository = aws_ecr_repository.streamflix_auth.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

locals {
  cluster_name = "streamflix"
  
  common_tags = {
    Project     = "Streamflix"
    Service     = "Authentication"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}