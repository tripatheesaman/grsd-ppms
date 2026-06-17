# PPMS Deployment

## Prerequisites

- Docker and Docker Compose on the server
- Caddy configured with PPMS routes (see CADDY.md)
- `config/.env.production` on the server under the deployment directory

## Production deploy

1. Create `/srv/grsd-ppms/uploads` with appropriate permissions
2. Place `config/.env.production` with `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CRON_SECRET`, and MySQL credentials
3. Pull and start:

```bash
docker compose pull
docker compose up -d
```

The app binds to `127.0.0.1:3007` and runs migrations on start.

## Development

```bash
npm run docker:dev:up
```

App: http://127.0.0.1:3007/ppms  
MySQL: 127.0.0.1:3309
