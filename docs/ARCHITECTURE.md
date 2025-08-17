# Our Arab Heritage – System Architecture

## 🌟 Overview
Our Arab Heritage is a modern full-stack web platform showcasing and selling Arab cultural products. It features secure authentication, seller dashboards, order management, and a custom marketplace interface—all optimized for performance, security, and scalability.

---

## 🧱 Technology Stack

| Layer         | Technology            |
|---------------|------------------------|
| Frontend      | Next.js (React + SSR)  |
| Backend       | Node.js + Express      |
| Database      | PostgreSQL + Prisma    |
| Cache         | Redis (Rate limiting, sessions) |
| Authentication| JWT + WebAuthn + CSRF  |
| Deployment    | Docker + Traefik       |
| Hosting       | Railway or VPS w/ Docker Compose |
| CDN           | Cloudflare (or similar) |
| Monitoring    | Sentry (error tracking), Plausible (analytics) |

---

## 🌐 System Diagram

```mermaid
graph TB
  subgraph Cloud Provider
    subgraph VPC
      subgraph Public Subnet
        CDN[CDN (Cloudflare)]
        Frontend[Next.js (Frontend)]
        API[Node.js API]
      end
      subgraph Private Subnet
        DB[(PostgreSQL Database)]
        Cache[(Redis Instance)]
      end
    end
  end
  CDN --> Frontend
  Frontend --> API
  API --> DB
  API --> Cache
