# Netflix‑Style Streaming Service – Project Structure

```text
netflix-clone/
├─ api-gateway/                # Edge API gateway service
│  ├─ src/
│  ├─ config/
│  └─ tests/
├─ services/
│  ├─ auth/                    # Authentication service
│  │  ├─ src/
│  │  ├─ tests/
│  │  └─ Dockerfile
│  ├─ profile/                 # User/Profile service
│  ├─ video-mgmt/              # Video metadata service
│  ├─ transcoding/             # Video transcoding worker
│  ├─ catalog-search/          # Catalog & search service
│  ├─ playback-drm/            # Playback & DRM license service
│  ├─ rec/                     # Recommendation service
│  ├─ analytics/               # Analytics / logging service
│  └─ billing/                 # Billing & subscription service
├─ frontend/                   # Web/mobile client application
│  ├─ src/
│  ├─ public/
│  └─ tests/
├─ libs/                       # Shared utilities, types, SDKs
│  ├─ common/
│  └─ ui-components/
├─ infra/                      # IaC (Terraform, Helm, k8s manifests)
├─ config/                     # Centralized configs (env, logging, secrets)
├─ docs/                       # Specs, architecture diagrams, API contracts
│  ├─ project_task.md
│  └─ microservices_specs.md
├─ scripts/                    # CI/CD scripts, helpers
├─ docker-compose.yml
├─ README.md
└─ .github/                    # GitHub Actions workflows, issue templates
```
