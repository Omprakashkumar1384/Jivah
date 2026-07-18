# Jivah

Hospital/clinic management platform — backend (NestJS), dashboard (Next.js), and realtime service (Socket.IO).

## Prerequisites

- Docker Desktop running (for Postgres + Redis)
- Node.js installed

## Running locally — 3 terminals needed

This app requires 3 separate processes running at the same time. Open 3 terminal windows/tabs:

### Terminal 1 — Backend (port 3000)
cd apps/backend
npm run start:dev

### Terminal 2 — Dashboard (port 3001)
cd apps/dashboard
npm run dev

### Terminal 3 — Realtime service (port 4000)
cd apps/realtime
npm run dev

All three must be running for the app to work fully — the dashboard needs the backend for data, and needs the realtime service for live queue updates (patient portal, doctor portal).

## First-time setup

If this is a fresh clone (or Docker was reset and tables are missing):

docker-compose up -d
docker cp apps/backend/migrations/schema.sql jivah-postgres-1:/schema.sql
docker exec -it jivah-postgres-1 psql -U jivah -d jivah_db -f /schema.sql

Then npm install inside each of apps/backend, apps/dashboard, and apps/realtime.

## Structure

Jivah/
- apps/
  - backend/        NestJS API (auth, hospitals, appointments, staff, store)
  - dashboard/       Next.js — all 5 role portals (hospital head, doctor, staff, store owner, patient)
  - realtime/        Socket.IO + Redis pub/sub for live queue updates
  - patient-app/     React Native — not started yet
- docs/
- docker-compose.yml

## More details

See Jivah_Progress_Notes.md and Jivah_Roadmap_Aage_Kya_Karna_Hai.md for full history and what's left to build.
