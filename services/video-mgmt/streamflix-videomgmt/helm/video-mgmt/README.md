# Video Management Service Helm Chart

This Helm chart deploys the Video Management Service for the Streamflix platform in a Kubernetes cluster.

## Prerequisites

-   Kubernetes 1.19+
-   Helm 3.2.0+
-   PV provisioner support in the underlying infrastructure

## Installing the Chart

To install the chart with the release name `video-mgmt`:

```bash
$ helm repo add bitnami https://charts.bitnami.com/bitnami
$ helm dependency update ./helm/video-mgmt
$ helm install video-mgmt ./helm/video-mgmt
```

The command deploys the Video Management Service on the Kubernetes cluster in the default configuration. The [Parameters](#parameters) section lists the parameters that can be configured during installation.

## Uninstalling the Chart

To uninstall/delete the `video-mgmt` deployment:

```bash
$ helm delete video-mgmt
```

## Parameters

### Global parameters

| Name               | Description                                    | Value                   |
| ------------------ | ---------------------------------------------- | ----------------------- |
| `replicaCount`     | Number of replicas of the Video Management pod | `3`                     |
| `image.repository` | Video Management image repository              | `streamflix/video-mgmt` |
| `image.tag`        | Video Management image tag                     | `latest`                |
| `image.pullPolicy` | Video Management image pull policy             | `Always`                |

### Service parameters

| Name           | Description  | Value       |
| -------------- | ------------ | ----------- |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `8080`      |

### Database parameters

| Name                      | Description                                | Value                                                 |
| ------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| `database.url`            | PostgreSQL JDBC URL                        | `jdbc:postgresql://postgresql:5432/streamflix_videos` |
| `database.existingSecret` | Name of existing secret for DB credentials | `video-mgmt-db-secrets`                               |

### Autoscaling parameters

| Name                                            | Description                          | Value  |
| ----------------------------------------------- | ------------------------------------ | ------ |
| `autoscaling.enabled`                           | Enable autoscaling                   | `true` |
| `autoscaling.minReplicas`                       | Minimum number of replicas           | `3`    |
| `autoscaling.maxReplicas`                       | Maximum number of replicas           | `10`   |
| `autoscaling.targetCPUUtilizationPercentage`    | Target CPU utilization percentage    | `70`   |
| `autoscaling.targetMemoryUtilizationPercentage` | Target Memory utilization percentage | `80`   |

For a complete list of parameters, see the [values.yaml](values.yaml) file.
