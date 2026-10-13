# Boxxed Backend API

Standalone backend microservice engine for the **Boxxed** food salvage & culinary mystery drop platform. Built on **NestJS 11**, **Apollo GraphQL v5 (code-first)**, **Prisma 7 (PostgreSQL 17 adapter)**, and **Redis 7**.

---

## 🏗️ Architecture & Repository Structure

This repository is organized as an efficient pnpm workspace bundling the core API server, database definitions, and shared contracts:

```
boxxed-backend/
├── apps/
│   └── api/                  # Main NestJS GraphQL & REST service
│       ├── prisma/           # Prisma schema, migrations & seed scripts
│       ├── src/
│       │   ├── modules/
│       │   │   ├── admin/    # Super Admin GraphQL resolvers & operations
│       │   │   ├── vendor/   # Restaurant Vendor Partner portal engine
│       │   │   ├── customer/ # Public Discover feed & reservation hold engine
│       │   │   ├── auth/     # JWT, phone/email OTP, and Google auth
│       │   │   ├── users/    # Customer profile & onboarding state
│       │   │   └── health/   # Liveness & readiness probes
│       │   └── infra/        # Prisma, Redis, Pino logging, Mailpit, SMS
│       └── test/             # Unit and E2E integration test suites
├── packages/
│   └── shared/               # Shared schema.graphql, error codes & DTOs
├── prisma/ -> apps/api/prisma # Symlink for direct root-level prisma access
├── docker-compose.yml        # PostgreSQL 17, Redis 7, Mailpit email catcher
├── .env.example              # Environment variables template
└── pnpm-workspace.yaml       # Workspace dependencies configuration
```

---

## 📋 Prerequisites

- **Node.js**: `v24.x` (LTS recommended)
- **pnpm**: `v12.x` or later (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker & Docker Compose**: For local PostgreSQL, Redis, and Mailpit containers

---

## 🚀 Quickstart Guide

### 1. Clone & Setup Environment

```bash
git clone https://github.com/Hussainforvercel/boxxed-backend.git
cd boxxed-backend

# Copy environment variables
cp .env.example .env
cp .env.example apps/api/.env
```

### 2. Boot Infrastructure Containers

Start PostgreSQL (port 5433), Redis (port 6379), and Mailpit (port 8025):

```bash
docker compose up -d --wait
```

### 3. Install Dependencies & Build Shared Packages

```bash
pnpm install
pnpm build
```

### 4. Run Migrations & Seed Default Accounts

```bash
# Apply PostgreSQL schema migrations
pnpm db:migrate:deploy

# Generate Prisma client
pnpm db:generate

# Seed Super Admin and Partner #100 accounts
pnpm db:seed
```

### 5. Launch the NestJS Development Server

```bash
pnpm start:dev
```

The API will boot on **http://localhost:3100**:
- **GraphQL Endpoint**: `http://localhost:3100/graphql`
- **Health Check Probe**: `http://localhost:3100/health`
- **Mailpit Web UI**: `http://localhost:8025`

---

## 🔑 Default Provisioned Credentials

### 1. Root Super Admin
- **Email**: `admin@boxxed.pk`
- **Password**: `SuperAdmin123!@#`
- **Role**: `SUPER_ADMIN`

### 2. Restaurant Partner #100 (The Flour Pavilion / Clifton Branch)
- **Email / Username**: `manager@flourpavilion.pk`
- **Password**: `Partner123!@#`
- **Station ID**: `TFP-CLI-01`
- **Role**: `RESTAURANT_ADMIN`

### 3. Test Customer
- **Phone**: `+923000000001`
- **Test OTP Code**: `424242`

---

## 🧪 Testing

```bash
# Run unit tests across all modules
pnpm test

# Run E2E integration test suites (requires running Postgres & Redis)
pnpm test:integration
```

---

## 🛠️ Workspace Scripts Reference

| Command | Description |
|---|---|
| `pnpm dev` / `pnpm start:dev` | Start NestJS API server with hot-reload watch mode |
| `pnpm build` | Compile `@boxxed/shared` and NestJS production build |
| `pnpm typecheck` | Run TypeScript compiler type checking |
| `pnpm test` | Execute Jest unit test suites |
| `pnpm test:integration` | Execute E2E integration test suites with open handles check |
| `pnpm db:migrate:dev` | Create and apply a new migration during development |
| `pnpm db:migrate:deploy` | Apply all pending migrations to the active database |
| `pnpm db:seed` | Seed default Super Admin and Partner accounts |
| `pnpm codegen` | Emit latest GraphQL schema to `packages/shared/schema.graphql` |
| `pnpm infra:up` | Spin up background Docker containers |
| `pnpm infra:down` | Stop background Docker containers |

---

## 📄 License

Proprietary — Boxxed Hospitality Platform. All rights reserved.
