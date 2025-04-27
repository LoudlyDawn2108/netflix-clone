# Full stack cloud native netflix clone (frontend)

## Frontend Functional Specifications

### 1. Architecture Overview

-   Single Page Application (SPA) built with React 18 and Vite
-   Communicates with API Gateway over HTTPS (REST)
-   Modular structure: pages, components, services, hooks, assets
-   Client-side routing via React Router v6
-   State management using React Context + Redux Toolkit for global data
-   Code splitting and lazy loading for performance

### 2. Tech Stack & Tooling

-   Framework: React 18, TypeScript
-   Bundler: Vite
-   Styling: CSS Modules / Tailwind CSS (optional)
-   HTTP client: Axios or Fetch with central service layer
-   Linter & formatting: ESLint, Prettier
-   Testing: Jest + React Testing Library
-   CI/CD: GitHub Actions for lint, build, test, deploy

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

#### 4.3 Content & Search

-   GET `/videos?page&limit&filter`
-   GET `/videos/{id}`
-   GET `/search?q&genre&year&page&limit`
-   GET `/videos/{id}/related`

#### 4.4 Playback & DRM

-   GET `/playback/{videoId}/manifest?token=JWT`
-   POST `/drm/license`

#### 4.5 Recommendations

-   GET `/recs/{userId}?limit`

#### 4.6 Billing & Subscription

-   POST `/subscriptions`
-   GET `/subscriptions/{userId}`
-   POST `/subscriptions/{id}/cancel`
-   GET `/plans`

#### 4.7 Analytics Events

-   POST `/events` batch of events: page view, play start/stop, rating, search

### 5. State & Data Management

-   Local: sessionStorage for tokens, IndexedDB for PWA offline cache
-   Global: Redux for user, playback state, recommendations
-   Memoization with React Query or SWR for API caching

### 6. Security & Compliance

-   Store JWT in memory or secure cookie (HttpOnly)
-   CSRF protection on state-changing calls
-   Input validation on forms
-   CSP, XSS hardening

### 7. Non‑Functional Requirements

-   PWA support: offline shell, service worker caching
-   Responsive design: mobile, tablet, desktop
-   Accessibility: WCAG 2.1 AA compliance
-   Performance budgets: TTI < 3s, Lighthouse score > 90

### 8. Observability & Monitoring

-   Client‑side logging to Sentry or LogRocket
-   Metrics: page load time, API error rates
-   User event tracking sent to Analytics Service

### 9. CI/CD & Deployment

-   Build: `npm run build` in CI
-   Deploy static assets to CDN (S3 + CloudFront)
-   Invalidate cache on new release
-   Canary deploy via feature flags (optional)

### 10. Testing & Quality

-   Unit tests for components and hooks
-   Integration tests for API services with MSW (Mock Service Worker)
-   E2E tests with Playwright or Cypress

---

_These specifications ensure the frontend integrates seamlessly with backend microservices, delivering a performant, secure, and user‑centric video streaming experience._
