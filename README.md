# GRSD PPMS

Public Procurement Monitoring System for GRSD.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- MySQL 8 + Prisma
- Redux Toolkit + RTK Query
- JWT authentication (15 min access / 7 day refresh)
- Docker + GitHub Actions CI/CD

## Quick start (local)

```bash
cp config/env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000/ppms

Default superadmin: `superadmin@nac.com.np` / `Testing@123`

## Docker development

```bash
npm run docker:dev:up
```

App: http://127.0.0.1:3007/ppms

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/CADDY.md](docs/CADDY.md).

Production image: `tripatheesaman/grsd-ppms:latest`
