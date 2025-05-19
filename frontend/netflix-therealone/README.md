# Full stack cloud native netflix clone (frontend)

## Frontend Functional Specifications

### 1. Architecture Overview

-   Single Page Application (SPA) built with React 18 and Vite
-   Communicates with API Gateway over HTTPS (REST)
-   Modular structure: pages, components, services, hooks, assets
-   Client-side routing via React Router v6
-   State management using React Context + Redux Toolkit for global data
-   Code splitting and lazy loading for performance
-   Backend-for-Frontend (BFF) pattern integration with API Gateway aggregation
-   Event-driven architecture with WebSockets/SSE for real-time updates

### 2. Tech Stack & Tooling

-   Framework: React 18, Javascript with JSDocs for type annotation
-   Bundler: Vite
-   Styling: Tailwind CSS
-   HTTP client: Fetch with central service layer
-   Real-time: Socket.io/EventSource for service events
-   Linter & formatting: ESLint, Prettier
-   Testing: Jest + React Testing Library + MSW for API mocking
-   CI/CD: GitHub Actions for lint, build, test, deploy
-   OpenAPI: Auto-generated types from API schemas

### 3. UI/UX Functional Areas

1. Authentication flows: signup, login, token refresh, logout
2. Homepage & browse: carousel, categories, featured videos
3. Search & filters: typeahead, faceted filters, pagination
4. Video detail: metadata, ratings, reviews, add to watchlist
5. Playback: HLS/DASH player (hls.js/dash.js) with DRM integration
6. Profile & watchlist: view and manage watchlist/history, rating UI
7. Recommendations: display personalized lists
8. Billing & account: subscribe, view plans, cancel subscription
9. Settings: user preferences, avatar upload, password reset
10. Analytics & Telemetry: Client-side event tracking

### 4. API Integration & Contracts

_All calls via API Gateway (`/api/v1/...`), attach JWT in `Authorization: Bearer` header_

#### 4.1 Authentication

-   POST `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`
-   GET `/auth/me` to initialize user context

#### 4.2 Profile & Watchlist

-   GET/PUT `/profiles/{userId}`
-   GET/POST/DELETE `/profiles/{userId}/watchlist`
-   GET/POST `/profiles/{userId}/history`
-   GET/POST `/profiles/{userId}/ratings`
-   GET/POST `/profiles/{userId}/preferences`

#### 4.3 Content & Search

-   GET `/videos?page&limit&filter&category&year&language&tags`
-   GET `/videos/{id}`
-   GET `/videos/filter` for advanced filtering
-   GET `/videos/categories/{id}` for category browsing
-   GET `/videos/tags/{tag}` for tag-specific browsing
-   GET `/search?q&genre&year&page&limit`
-   GET `/videos/{id}/similar` for content-similar recommendations

#### 4.4 Playback & DRM

-   GET `/playback/{videoId}/manifest?token=JWT`
-   POST `/drm/license`
-   Metrics reporting for playback QoS (buffering, errors)

#### 4.5 Recommendations

-   GET `/recs/{userId}?limit&type&experiment_id`
-   Support for A/B testing with experiment IDs

#### 4.6 Billing & Subscription

-   POST `/subscriptions`
-   GET `/subscriptions/{userId}`
-   POST `/subscriptions/{id}/cancel`
-   GET `/plans`
-   Integration with Stripe Elements for secure payment

#### 4.7 Analytics Events

-   POST `/events` batch of events with standardized schema:
    -   Playback events: start, pause, seek, complete, error
    -   UI interactions: page view, click, search, filter
    -   Performance metrics: load time, TTI, errors
    -   User preferences: language, subtitle settings

### 5. State & Data Management

-   Local: sessionStorage for tokens, IndexedDB for PWA offline cache
-   Global: Redux for user, playback state, recommendations
-   Memoization with React Query or SWR for API caching
-   Circuit breaker pattern for API resilience
-   Optimistic UI updates with rollback capability

### 6. Security & Compliance

-   Store JWT in memory or secure cookie (HttpOnly)
-   CSRF protection on state-changing calls
-   Input validation on forms using schema validation
-   CSP, XSS hardening
-   DRM key security for content protection
-   Refresh token rotation for enhanced security
-   Compliance with regional data protection regulations

### 7. Non‑Functional Requirements

-   PWA support: offline shell, service worker caching
-   Responsive design: mobile, tablet, desktop
-   Accessibility: WCAG 2.1 AA compliance
-   Performance budgets: TTI < 3s, Lighthouse score > 90
-   Network resilience: graceful degradation on poor connections
-   Error boundaries for fault isolation

### 8. Observability & Monitoring

-   Client‑side logging to Sentry or LogRocket
-   Distributed tracing with OpenTelemetry integration
-   Real user monitoring (RUM)
-   Custom performance metrics for video playback
-   Integration with API Gateway observability
-   Error tracking with context for debugging

### 9. Service Integration Patterns

-   API contract testing with microservices
-   Feature flags for gradual rollout
-   BFF aggregation for complex views
-   WebSockets integration for real-time notifications
-   Event-based communication with backend services
-   Support for service mesh telemetry

### 10. Deployment & DevOps

-   Multi-environment deployment (dev, staging, prod)
-   Containerization with Docker
-   Feature branch previews
-   Blue/Green and Canary deployment support
-   Performance regression testing
-   Bundle analysis and optimization
