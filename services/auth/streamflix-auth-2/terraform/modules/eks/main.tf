provider "aws" {
  region = "us-west-2" # Default region, can be overridden
}

data "aws_eks_cluster" "this" {
  name = module.eks.cluster_id
}

data "aws_eks_cluster_auth" "this" {
  name = module.eks.cluster_id
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.this.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.this.token
}

locals {
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Service     = "StreamflixAuth"
    }
  )

  # Default node group configurations based on environment
  default_node_groups = {
    dev = {
      desired_capacity = 2
      max_capacity     = 3
      min_capacity     = 1
      instance_types   = ["t3.medium"]
      disk_size        = 50
    },
    staging = {
      desired_capacity = 3
      max_capacity     = 5
      min_capacity     = 2
      instance_types   = ["t3.large"]
      disk_size        = 75
    },
    prod = {
      desired_capacity = 5
      max_capacity     = 10
      min_capacity     = 3
      instance_types   = ["m5.large"]
      disk_size        = 100
    }
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${var.cluster_name}-${var.environment}"
  cluster_version = var.cluster_version
  
  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids

  cluster_endpoint_public_access = true

  # Allow self management of node groups
  self_managed_node_group_defaults = {
    instance_type                          = "t3.medium"
    update_launch_template_default_version = true
    iam_role_additional_policies = {
      AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    }
  }

  eks_managed_node_group_defaults = {
    disk_size      = 50
    instance_types = ["t3.medium"]
  }

  eks_managed_node_groups = {
    streamflix_auth = {
      name           = "streamflix-auth-${var.environment}"
      min_size       = lookup(local.default_node_groups[var.environment], "min_capacity")
      max_size       = lookup(local.default_node_groups[var.environment], "max_capacity")
      desired_size   = lookup(local.default_node_groups[var.environment], "desired_capacity")
      instance_types = lookup(local.default_node_groups[var.environment], "instance_types")
      capacity_type  = "ON_DEMAND"
      disk_size      = lookup(local.default_node_groups[var.environment], "disk_size")

      labels = {
        role = "streamflix-auth"
        env  = var.environment
      }

      taints = []

      update_config = {
        max_unavailable_percentage = 33
      }

      tags = local.common_tags
    }
  }

  # Add CloudWatch Logs for control plane logging
  cluster_enabled_log_types = [
    "api", "audit", "authenticator", "controllerManager", "scheduler"
  ]

  # Manage aws-auth configmap
  manage_aws_auth_configmap = true

  tags = local.common_tags
}