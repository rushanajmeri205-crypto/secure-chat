# Secure Chat PWA

A WhatsApp-style messaging web app with Snapchat-inspired camera snaps, admin-controlled users, and privacy deterrents.

## Features

- **WhatsApp-like UI**: chat list, message bubbles, read receipts, typing indicators
- **Snapchat-style camera**: full-screen capture, filters, front/back toggle, view-once snaps
- **Admin-only users**: only admins can create or delete accounts
- **3-strike login**: account is permanently deleted after 3 failed password attempts
- **Admin audit**: admins can view all chats and messages, even after users leave
- **Privacy (best-effort on web)**:
  - Blur overlay when tab is hidden or window loses focus
  - Block right-click on media
  - Log possible capture events
  - View-once snaps and optional 24h disappearing messages

## Important limitations

**Browsers cannot fully prevent screenshots or screen recording.** This app uses deterrents only, similar to many web apps. True protection requires native mobile apps.

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

## Quick start

```bash
# 1. Start database
cd secure-chat
docker compose up -d

# 2. Configure environment
copy .env.example apps\server\.env

# 3. Install dependencies
npm install

# 4. Run migrations and seed admin
npm run db:generate -w @secure-chat/server
npm run db:push -w @secure-chat/server
npm run db:seed -w @secure-chat/server

# 5. Start dev servers (API + web)
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:3001

### Default admin credentials

Set in `apps/server/.env`:

- Username: `admin` (or `ADMIN_USERNAME`)
- Password: `admin123` (or `ADMIN_PASSWORD`)

**Change these before any real deployment.**

## Usage flow

1. Log in as **admin**
2. Go to **Admin** → create users with username + password
3. Log out and log in as a regular user (or use two browsers)
4. Start a new chat, send messages, use the camera for snaps
5. Admin can open **Admin → All Chats** to audit any conversation

## Environment variables

See [.env.example](.env.example). Copy to `apps/server/.env`.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for auth tokens |
| `CLIENT_URL` | Frontend origin for CORS |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Bootstrap admin on seed |

## Production build

```bash
npm run build
NODE_ENV=production npm run start -w @secure-chat/server
```

Serve the built web app from `apps/web/dist` (the server can static-serve it when `NODE_ENV=production`).

## Project structure

```
secure-chat/
├── apps/
│   ├── web/          # React PWA (Vite + Tailwind)
│   └── server/       # Express + Socket.io + Prisma
├── docker-compose.yml
└── README.md
```

## Security notes

- Admin-readable message storage is intentional for audit; inform users if deploying beyond demos.
- Use strong `JWT_SECRET` and `MEDIA_TOKEN_SECRET` in production.
- Enable HTTPS so secure cookies work correctly.
